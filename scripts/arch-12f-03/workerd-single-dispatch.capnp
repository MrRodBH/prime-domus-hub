using Workerd = import "/workerd/workerd.capnp";

const config :Workerd.Config = (
  services = [
    (
      name = "probe",
      worker = (
        modules = [
          (
            name = "workerd-single-dispatch-worker.mjs",
            esModule = embed "workerd-single-dispatch-worker.mjs"
          )
        ],
        compatibilityDate = "2026-07-29",
        compatibilityFlags = ["nodejs_compat"],
        globalOutbound = "deny"
      )
    ),
    (
      name = "deny",
      network = (allow = [])
    )
  ],
  sockets = [
    (
      name = "http",
      address = "127.0.0.1:0",
      http = (),
      service = "probe"
    )
  ]
);
