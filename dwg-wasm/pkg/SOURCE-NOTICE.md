# Conversor local CAD2D3D (experimental)

Motor independiente de conversión bidireccional basado en acadrust 0.6.8 (MPL-2.0): https://crates.io/crates/acadrust/0.6.8 y https://docs.rs/crate/acadrust/0.6.8/source/. El código de esta carpeta se ofrece bajo MPL-2.0, https://www.mozilla.org/MPL/2.0/. El resto de CAD2D3D conserva su licencia original.

Build: instalar Rust estable y wasm-pack; ejecutar `cargo test --manifest-path dwg-wasm/Cargo.toml`, luego `wasm-pack build dwg-wasm --target web --release --out-dir pkg --out-name blackline_dwg`. Publicar los archivos generados y los avisos de licencia en `dwg-wasm/pkg/`. No activar el motor en producción antes de validar ambos sentidos con archivos reales, unidades, capas, bloques, cotas y layouts. La validación por cantidad de entidades no garantiza fidelidad completa. No se envían planos a servidores.
