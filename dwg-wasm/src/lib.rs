// SPDX-License-Identifier: MPL-2.0
use acadrust::{DwgReader, DwgWriter, DxfReader, DxfWriter};
use std::io::Cursor;
use wasm_bindgen::prelude::*;

const MAX_BYTES: usize = 64 * 1024 * 1024;

fn convert(input: &[u8], to_dwg: bool) -> Result<Vec<u8>, String> {
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
        if !writer.omitted_architecture_records().is_empty() {
            return Err("El archivo contiene objetos arquitectónicos que el escritor DXF omitiría".into());
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

#[wasm_bindgen]
pub fn dwg_to_dxf(input: &[u8]) -> Result<Vec<u8>, JsValue> {
    convert(input, false).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn dxf_to_dwg(input: &[u8]) -> Result<Vec<u8>, JsValue> {
    convert(input, true).map_err(|e| JsValue::from_str(&e))
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
