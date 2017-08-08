import rubberduck from 'rubberduck/dist/rubberduck'
import setupServiceModule from './service-module/service-module'
import setupAuthModule from './auth-module/auth-module'
import _merge from 'lodash.merge'
import _cloneDeep from 'lodash.clonedeep'
import { normalizePath, makeConfig } from './utils'

const defaultOptions = {
  idField: 'id', // The field in each record that will contain the id
  auto: true, // automatically setup a store for each service.
  autoRemove: false, // automatically remove records missing from responses (only use with feathers-rest)
  nameStyle: 'short', // Determines the source of the module name. 'short', 'path', or 'explicit'
  respectExisting: false, // if a module exists in the store already for a namespace of a service, respect that module's state, getters, mutations, and actions
  auth: {
    namespace: 'auth',
    userService: '', // Set this to automatically populate the user on login success.
    state: {}, // add custom state to the auth module
    getters: {}, // add custom getters to the auth module
    mutations: {}, // add custom mutations to the auth module
    actions: {} // add custom actions to the auth module
  }
}

export default function (clientOrStore, options = {}, modules = {}) {
  var theClone = _cloneDeep(defaultOptions)
  options = _merge(theClone, options)

  return function feathersVuex (arg) {
    const asFeathersPlugin = !arg
    const asVuePlugin = !asFeathersPlugin
    const feathers = asFeathersPlugin ? this : clientOrStore
    const store = asFeathersPlugin ? clientOrStore : arg

    if (asFeathersPlugin && !store) {
      throw new Error('You must pass the vuex store to the Feathers-Vuex plugin.')
    } else if (asVuePlugin && !feathers) {
      throw new Error('You must pass a Feathers Client instance to the Feathers-Vuex plugin.')
    }

    // Normalize the modules into objects if they were provided as a string or an array
    Object.keys(modules).forEach(namespace => {
      if (typeof modules[namespace] === 'string' || Array.isArray(modules[namespace])) {
        modules[namespace] = { namespace: modules[namespace] }
      }
    })

    const setup = setupServiceModule(store)
    const addConfigTo = makeConfig(options, modules)
    setupAuthModule(store, options)(feathers)

    // Add .vuex() function to each service to allow individual configuration.
    const addVuexMethod = function (service, options, modules) {
      service.vuex = function (moduleOptions = {}) {
        // Setting force will rebuild the vuex store.
        const force = moduleOptions.hasOwnProperty('force') ? moduleOptions.force : true
        delete moduleOptions.force

        addConfigTo(service, moduleOptions)
        setup(service, { force })
        return service
      }
    }

    // Duck punch the service method so we can detect when services are created.
    const emitter = rubberduck.emitter(feathers).punch('service')
    emitter.on('afterService', function (service, args, instance) {
      if (!service) {
        throw new Error('No service was created. Make sure you are using the client modules of all Feathers packages. For example, use `feathers-socketio/client` instead of `feathers-socketio`.')
      }
      var location = args[0]
      normalizePath(service, location)
      addVuexMethod(service, options, modules)

      // Only auto-setup on service creation, not on lookup
      if (options.auto && !service.vuexOptions) {
        service.vuex({force: false})
      }
      return service
    })

    // If running as a Vue Plugin, setup each service that was previously created.
    asVuePlugin && Object.keys(feathers.services).forEach(location => feathers.service(location))
  }
}
