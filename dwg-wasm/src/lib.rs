// SPDX-License-Identifier: MPL-2.0
use acadrust::{DwgReader, DwgWriter, DxfReader, DxfWriter};
use acadrust::document::{Preview, PreviewFormat};
use std::io::Cursor;
use wasm_bindgen::prelude::*;

const MAX_BYTES: usize = 64 * 1024 * 1024;

fn convert_checked(input: &[u8], to_dwg: bool, allow_partial: bool) -> Result<Vec<u8>, String> {
    if input.is_empty() || input.len() > MAX_BYTES {
        return Err("Archivo vacío o superior a 64 MiB".into());
    }
    let doc = if to_dwg {
        DxfReader::from_reader(Cursor::new(input.to_vec()))
            .and_then(|r| r.read()).map_err(|e| e.to_string())?
    } else {
        if !input.starts_with(b"AC10") { return Err("Cabecera DWG inválida".into()); }
        let mut reader = DwgReader::from_stream(Cursor::new(input.to_vec()));
        reader.read().map_err(|e| e.to_string())?
    };
    let expected = doc.entities().count();
    let output = if to_dwg {
        let bytes = DwgWriter::write_to_vec(&doc).map_err(|e| e.to_string())?;
        let mut reader = DwgReader::from_stream(Cursor::new(bytes.clone()));
        let check = reader.read().map_err(|e| format!("No se pudo reabrir DWG: {e}"))?;
        if expected != check.entities().count() { return Err("Cambió la cantidad de entidades; conversión rechazada".into()); }
        bytes
    } else {
        let writer = DxfWriter::new(&doc);
        let omitted = writer.omitted_architecture_records();
        let omitted_entities = omitted.iter().filter(|r| doc.get_entity(r.handle).is_some()).count();
        if !omitted.is_empty() && !allow_partial {
            let mut classes: Vec<&str> = omitted.iter().map(|r| r.name.as_str()).collect();
            classes.sort_unstable();
            classes.dedup();
            return Err(format!("AEC_OMISSIONS: {} entidades y {} registros auxiliares no exportables. Clases: {}.", omitted_entities, omitted.len().saturating_sub(omitted_entities), classes.join(", ")));
        }
        let expected = expected.checked_sub(omitted_entities).ok_or("Inventario de entidades incoherente")?;
        if expected == 0 && omitted_entities > 0 {
            return Err("No queda geometría exportable; se conserva el DWG original".into());
        }
        let bytes = writer.write_to_vec().map_err(|e| e.to_string())?;
        let check = DxfReader::from_reader(Cursor::new(bytes.clone())).and_then(|r| r.read())
            .map_err(|e| format!("No se pudo reabrir DXF: {e}"))?;
        if expected != check.entities().count() { return Err("Cambió la cantidad de entidades; conversión rechazada".into()); }
        bytes
    };
    if output.is_empty() || output.len() > MAX_BYTES * 4 { return Err("Salida vacía o excesiva".into()); }
    Ok(output)
}

fn convert(input: &[u8], to_dwg: bool) -> Result<Vec<u8>, String> {
    convert_checked(input, to_dwg, false)
}

// Explicitly requested by the UI after warning about the listed omissions.
#[wasm_bindgen]
pub fn dwg_to_dxf_partial(input: &[u8]) -> Result<Vec<u8>, JsValue> {
    convert_checked(input, false, true).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn dwg_to_dxf(input: &[u8]) -> Result<Vec<u8>, JsValue> {
    convert(input, false).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn dxf_to_dwg(input: &[u8]) -> Result<Vec<u8>, JsValue> {
    convert(input, true).map_err(|e| JsValue::from_str(&e))
}


// Optional thumbnail for the native DWG writer. Never append image bytes
// after EOF: the writer must construct the preview section and checksums.
#[wasm_bindgen]
pub fn dxf_to_dwg_with_preview(input: &[u8], png: &[u8]) -> Result<Vec<u8>, JsValue> {
    fn encode(input: &[u8], png: &[u8]) -> Result<Vec<u8>, String> {
        if input.is_empty() || input.len() > MAX_BYTES || png.len() < 24 || png.len() > 2 * 1024 * 1024
            || !png.starts_with(b"\x89PNG\r\n\x1a\n") || &png[12..16] != b"IHDR" {
            return Err("Datos DXF o miniatura PNG inválidos".into());
        }
        let width = u32::from_be_bytes(png[16..20].try_into().unwrap());
        let height = u32::from_be_bytes(png[20..24].try_into().unwrap());
        if width == 0 || height == 0 || width > 1024 || height > 1024 {
            return Err("Dimensiones de miniatura inválidas".into());
        }
        let mut doc = DxfReader::from_reader(Cursor::new(input.to_vec()))
            .and_then(|r| r.read()).map_err(|e| e.to_string())?;
        if doc.version < acadrust::DxfVersion::AC1027 {
            return Err("La miniatura PNG requiere DWG 2013 o posterior".into());
        }
        let expected = doc.entities().count();
        doc.preview = Some(Preview { format: PreviewFormat::Png, data: png.to_vec() });
        let bytes = DwgWriter::write_to_vec(&doc).map_err(|e| e.to_string())?;
        if bytes.is_empty() || bytes.len() > MAX_BYTES * 4 { return Err("Salida vacía o excesiva".into()); }
        let mut reader = DwgReader::from_stream(Cursor::new(bytes.clone()));
        let check = reader.read().map_err(|e| format!("No se pudo reabrir DWG: {e}"))?;
        if check.entities().count() != expected { return Err("Cambió la cantidad de entidades; conversión rechazada".into()); }
        if check.preview.as_ref() != doc.preview.as_ref() { return Err("No se pudo verificar la miniatura DWG".into()); }
        Ok(bytes)
    }
    encode(input, png).map_err(|e| JsValue::from_str(&e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use acadrust::{CadDocument, DxfVersion, EntityType, Line};
    #[test]
    fn roundtrip() {
        let mut doc = CadDocument::with_version(DxfVersion::AC1027);
        doc.add_entity(EntityType::Line(Line::from_coords(0.,0.,0.,10.,4.,0.))).unwrap();
        let dxf = DxfWriter::new(&doc).write_to_vec().unwrap();
        let dwg = convert(&dxf,true).unwrap();
        assert!(dwg.starts_with(b"AC1027"));
        let back = convert(&dwg,false).unwrap();
        let check = DxfReader::from_reader(Cursor::new(back)).unwrap().read().unwrap();
        assert_eq!(check.entities().count(),1);
    }
}
