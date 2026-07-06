// Plugins — superfície pública (Fase 6 · Bloco 4 · Etapa 4.4).
// Infraestrutura de plugin. Não expõe internos de Registry/Snapshot/Resolution.
export type {
  PluginManifest,
  PluginModule,
  PluginEntry,
  PluginCapability,
  PluginPermission,
} from "./PluginManifest";
export {
  validateManifest,
  hasPermission,
  SUPPORTED_API_VERSIONS,
  PluginValidationError,
} from "./PluginValidator";
export {
  createPluginRegistry,
  PluginAlreadyRegisteredError,
  PluginNotFoundError,
  type PluginRegistry,
} from "./PluginRegistry";
export {
  createPluginLoader,
  PluginLoadError,
  type PluginLoader,
  type PluginSource,
} from "./PluginLoader";
export {
  createFeatureFlagService,
  type FeatureFlagService,
} from "./FeatureFlagService";
export {
  createPluginContext,
  type PluginContext,
} from "./PluginContext";
