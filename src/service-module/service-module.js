import { getShortName, getNameFromPath, getNameFromExplicit, storeHasServiceModule, deleteExistingWrappedGetters, mergeExisting } from '../utils'
import _merge from 'lodash.merge'
import makeState from './state'
import makeGetters from './getters'
import makeMutations from './mutations'
import makeActions from './actions'

export default function setupServiceModule (store) {
  return function setupServiceOnStore (service, { force }) {
    const { vuexOptions } = service
    const nameStyles = {
      short: getShortName,
      path: getNameFromPath,
      explicit: getNameFromExplicit
    }
    let namespace = nameStyles[vuexOptions.global.nameStyle](service)
    const oldName = vuexOptions.module.oldName

    // When .vuex() is manually called, tear down the previous module if it's a set up service module
    // Tear down before the module name is updated to remove the correct one.
    if (oldName && storeHasServiceModule(store, oldName)) {
      store.unregisterModule(oldName)
    }

    // update the name
    _merge(service.vuexOptions, { module: { namespace } })
    vuexOptions.modules[service.path] = vuexOptions.module

    // Setup if module is not present/not set up, or re-setup the module if .vuex() was called manually.
    if (!storeHasServiceModule(store, namespace) || force) {
      const rawModule = {
        namespaced: true,
        state: makeState(service),
        getters: makeGetters(service),
        mutations: makeMutations(service),
        actions: makeActions(service)
      }

      // If the module exists in the store, it is not a service module, optionally respect its setup
      if (vuexOptions.respectExisting) {
        mergeExisting(rawModule, store, namespace, { namespaced: true })
      }

      // clean up stray getters when we register over an existing module
      deleteExistingWrappedGetters(store, namespace)
      store.registerModule(namespace, rawModule)
    }
  }
}
