use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let migrations = vec![
    Migration {
      version: 1,
      description: "initial_local_schema",
      sql: include_str!("../migrations/0001_initial.sql"),
      kind: MigrationKind::Up,
    },
    Migration {
      version: 2,
      description: "local_onboarding",
      sql: include_str!("../migrations/0002_local_onboarding.sql"),
      kind: MigrationKind::Up,
    },
    Migration {
      version: 3,
      description: "quote_compliance",
      sql: include_str!("../migrations/0003_quote_compliance.sql"),
      kind: MigrationKind::Up,
    },
  ];

  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_persisted_scope::init())
    .plugin(
      tauri_plugin_sql::Builder::default()
        .add_migrations("sqlite:pimoo.db", migrations)
        .build(),
    )
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
