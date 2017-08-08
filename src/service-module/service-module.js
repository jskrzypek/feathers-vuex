import { getShortName, getNameFromPath, getNameFromExplicit, getModuleFromStore } from '../utils'
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

    // When .vuex() is manually called, tear down the previous module.
    // Tear down before the module name is updated to remove the correct one.
    if (getModuleFromStore(store, oldName)) {
      store.unregisterModule(oldName)
    }

    // update the name
    _merge(service.vuexOptions, { module: { namespace } })
    vuexOptions.modules[service.path] = vuexOptions.module

    // Setup or re-setup the module if .vuex() was called manually.
    if (!getModuleFromStore(store, namespace) || force) {
      store.registerModule(namespace, {
        namespaced: true,
        state: makeState(service),
        getters: makeGetters(service),
        mutations: makeMutations(service),
        actions: makeActions(service)
      })
    }
  }
}
