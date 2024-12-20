use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use brotli::enc::BrotliEncoderParams;
#[cfg(target_arch = "wasm32")]
use brotli::Decompressor;
use serde_json;
use serde_yaml;
#[cfg(target_arch = "wasm32")]
use std::io::Read;
#[cfg(target_arch = "wasm32")]
use tracing::error;
#[cfg(target_arch = "wasm32")]
use uuid::Uuid;

pub fn compress_and_encode(yaml_data: &str) -> String {
    // Convert YAML to JSON
    let mut yaml: serde_yaml::Value = serde_yaml::from_str(yaml_data).unwrap();

    // Remove all 'id' fields
    remove_ids(&mut yaml);

    let json = serde_json::to_string(&yaml).unwrap();

    let mut compressed = Vec::new();
    let params = BrotliEncoderParams::default();
    brotli::BrotliCompress(&mut json.as_bytes(), &mut compressed, &params).unwrap();
    URL_SAFE_NO_PAD.encode(&compressed)
}

fn remove_ids(value: &mut serde_yaml::Value) {
    match value {
        serde_yaml::Value::Mapping(map) => {
            map.remove("id");
            for (_, v) in map.iter_mut() {
                remove_ids(v);
            }
        }
        serde_yaml::Value::Sequence(seq) => {
            for item in seq.iter_mut() {
                remove_ids(item);
            }
        }
        _ => {}
    }
}
#[cfg(target_arch = "wasm32")]
pub fn decode_and_decompress(encoded_data: &str) -> Option<String> {
    // Step 1: Base64 decoding
    let decoded_base64 = match URL_SAFE_NO_PAD.decode(encoded_data) {
        Ok(decoded) => decoded,
        Err(e) => {
            error!("Failed to decode base64: {:?}", e);
            return None;
        }
    };

    // Step 2: Brotli decompression
    let mut decompressed = Vec::new();
    let mut decompressor = Decompressor::new(&decoded_base64[..], 4096);
    match decompressor.read_to_end(&mut decompressed) {
        Ok(_size) => {}
        Err(e) => {
            error!("Failed to decompress data: {:?}", e);
            return None;
        }
    };

    // Step 3: UTF-8 conversion (JSON string)
    let json_str = match String::from_utf8(decompressed) {
        Ok(s) => s,
        Err(e) => {
            error!("Failed to convert decompressed data to UTF-8: {:?}", e);
            return None;
        }
    };

    // Step 4: Convert JSON back to YAML and add random IDs
    match serde_json::from_str::<serde_json::Value>(&json_str) {
        Ok(mut json) => {
            add_random_ids(&mut json);
            match serde_yaml::to_string(&json) {
                Ok(yaml) => Some(yaml),
                Err(e) => {
                    error!("Failed to convert JSON to YAML: {:?}", e);
                    None
                }
            }
        }
        Err(e) => {
            error!("Failed to parse JSON: {:?}", e);
            None
        }
    }
}
#[cfg(target_arch = "wasm32")]
fn add_random_ids(value: &mut serde_json::Value) {
    match value {
        serde_json::Value::Object(map) => {
            map.insert(
                "id".to_string(),
                serde_json::Value::String(Uuid::new_v4().to_string()),
            );
            for (_, v) in map.iter_mut() {
                add_random_ids(v);
            }
        }
        serde_json::Value::Array(arr) => {
            for item in arr.iter_mut() {
                add_random_ids(item);
            }
        }
        _ => {}
    }
}
