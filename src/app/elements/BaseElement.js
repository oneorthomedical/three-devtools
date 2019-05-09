import { LitElement } from '../../../web_modules/lit-element.js'

const $onStoreUpdate = Symbol('onStoreUpdate');

export default class BaseElement extends LitElement {

  static get properties() {
    return {
      uuid: {type: String, reflect: true}
    }
  }

  constructor() {
    super();
    this[$onStoreUpdate] = this[$onStoreUpdate].bind(this);
  }

  connectedCallback() {
    super.connectedCallback && super.connectedCallback();
    let app = this.closest('three-devtools-app');

    // Looks like we can't pierce upwards outside of the shadow DOM?
    // Or we are getting callbacks fired when connected to an element outside
    // the DOM (e.g. `div -> tree-item` tree-item is getting connected callback,
    // but `div` its parent is disconnected).
    // Just query the entire page.
    if (!app) {
      app = document.querySelector('three-devtools-app');
    }

    if (!app) {
      throw new Error('BaseElement must be a child of <three-devtools-app>');
    }

    this.app = app;
    this.app.addEventListener('store-update', this[$onStoreUpdate]);
  }

  disconnectedCallback() {
    super.disconnectedCallback && super.disconnectedCallback();
    this.app.removeEventListener('store-update', this[$onStoreUpdate]);
    this.app = null;
  }

  [$onStoreUpdate](e) {
    // If the tracked object has been updated in
    // storage, force a rerender
    if (e.detail.uuid === this.uuid) {
      this.requestUpdate();
    }
  }
}