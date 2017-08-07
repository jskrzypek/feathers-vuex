import _merge from 'lodash.merge'
import _cloneDeep from 'lodash.clonedeep'
import _trim from 'lodash.trim'

export function stripSlashes (location) {
  return Array.isArray(location) ? location.map(l => _trim(l, '/')) : _trim(location, '/')
}

export function normalizePath (service, location) {
  service.path = service.path || service.name || stripSlashes(location)
  return service
}

export function upperCaseFirst (string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export function getNameFromConfig (service) {
  return service.vuexOptions.module && service.vuexOptions.module.namespace
}

export function getShortName (service) {
  // If a name was manually provided, use it.
  let namespace = getNameFromConfig(service)
  if (namespace) {
    return stripSlashes(namespace)
  }

  // Otherwise, create a short name.
  namespace = stripSlashes(service.path)
  if (Array.isArray(namespace)) {
    namespace = namespace.slice(-1);
  } else if (namespace.includes('/')) {
    namespace = namespace.slice(namespace.lastIndexOf('/') + 1)
  }
  return namespace
}

export function getNameFromPath (service) {
  // If a name was manually provided, use it.
  let namespace = getNameFromConfig(service)
  if (namespace) {
    return stripSlashes(namespace)
  }

  // Otherwise return the full service path.
  namespace = service.path
  return namespace
}

export function getNameFromExplicit (service) {
  const namespace = getNameFromConfig(service)
  if (!namespace) {
    throw new Error(`The feathers-vuex nameStyle attribute is set to explicit, but no name was provided for the ${service.path} service.`)
  }
  return namespace
}

export function makeConfig (options, modules) {
  return (service, moduleOptions) => {
    modules[service.path] = modules[service.path] || {}

    if (service.vuexOptions && service.vuexOptions.module) {
      moduleOptions.oldName = service.vuexOptions.module.namespace
    }

    // moduleOptions (passed to the vuex method) will overwrite previous options.
    if (moduleOptions) {
      _merge(modules[service.path], moduleOptions)
    }

    // Make the config available on the service.
    service.vuexOptions = {
      global: options,
      module: modules[service.path],
      modules: modules
    }
    return service
  }
}

export function castArray (value) {
  return Array.isArray(value) ? value : [value]
}

export function getModuleFromStore (store, namespace) {
  try {
    return store._modules.get(castArray(namespace))
  } catch (e) {
    return null
  }
}

export function getNamespaceFromStore (store, path) {
  try {
    return store._modules.getNamespace(castArray(path))
  } catch (e) {
    return null
  }
}

export function deleteExistingWrappedGetters (store, namespace) {
  let existing = getModuleFromStore(store, namespace)
  if (existing) {
    namespace = getNamespaceFromStore(store, namespace)
    existing.forEachGetter((getter, key) => {
      delete store._wrappedGetters[namespace + key]
    })
  }
}

export function getChildModules (existing) {
  if (existing._children && Object.keys(existing._children).length > 0) {
    return { modules: Object.keys(existing._children).reduce(key => cloneRawModule(existing._children[key])) }
  } else {
    return {}
  }
}

export function cloneRawModule(existing) {
  return existing
    ? _cloneDeep({
      ...existing._rawModule,
      ...{ state: { ...existing.state, [SERVICE_MODULE_SETUP_DONE]: true } },
      ...getChildModules(existing)
    })
    : {}
}

export function mergeExisting(mergeTarget, store, namespace, ...others) {
  return _merge(mergeTarget, cloneRawModule(getModuleFromStore(store, namespace)), ...others)
}

export function storeHasServiceModule (store, namespace) {
  return getModuleFromStore(store, namespace) && getModuleFromStore(store, namespace).state[SERVICE_MODULE_SETUP_DONE]
}

export const SERVICE_MODULE_SETUP_DONE = 'SERVICE_MODULE_SETUP_DONE'

// from https://github.com/iliakan/detect-node
export const isNode = Object.prototype.toString.call(typeof process !== 'undefined' ? process : 0) === '[object process]'

export const isBrowser = !isNode
