// src/pages/timeline_page.rs

use crate::models::{MyLifeApp, Yaml};
use crate::ui::{TopPanel, CentralPanel, BottomPanel};
use crate::state_manager::initialize_state;
use dioxus::prelude::*;
use crate::routes::Route;

#[component]
pub fn TimelinePage(y: String) -> Element {
    let (yaml_state, app_state) = initialize_state(&y);
    let yaml_state = use_signal(|| yaml_state);
    let app_state = use_signal(|| app_state);

    use_context_provider(|| yaml_state);
    use_context_provider(|| app_state);

    rsx! {
        div {
            class: "app-container",
            TopPanel {}
            CentralPanel {}
            BottomPanel {}
        }
        Link {
            to: Route::HomePage { y: String::new() },
            "Go to Home"
        }
    }
}