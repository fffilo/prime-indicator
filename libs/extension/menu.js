/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// Strict mode.
'use strict';

// Import modules.
const {GLib, GObject} = imports.gi;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const GnomeSession = imports.misc.gnomeSession;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Prime = Me.imports.libs.extension.prime;
const Icons = Me.imports.libs.extension.icons;
const Log = Me.imports.libs.extension.log;
const _ = ExtensionUtils.gettext || imports.gettext.gettext;

/**
 * Widget extends PopupMenu.PopupSubMenuMenuItem.
 */
var Widget = GObject.registerClass({
    GTypeName: 'PrimeIndicatorMenuWidget',
}, class Widget extends PopupMenu.PopupSubMenuMenuItem {
    /**
     * Constructor.
     *
     * @return {Void}
     */
    _init() {
        super._init(_("Prime Select"), true);

        this._settings = ExtensionUtils.getSettings();
        this.settings.connect('changed', this._handleSettings.bind(this));

        this._switch = new Prime.Switch();
        this.switch.connect('gpu-change', this._handlePrimeGpuChange.bind(this));
        this.switch.monitor();

        this._timeoutSourceId = null;
        this._pending = false;
        this._loggingOut = false;

        this.icon.set_gicon(new Icons.Icon(Icons.DEFAULT));

        this._ui = {};
        let switches = this.switch.switches;
        if (switches.includes('intel')) {
            this._ui.intel = new PopupMenu.PopupMenuItem(_("Intel"));
            this._ui.intel.connect('activate', this._handleMenuItemClick.bind(this));
            this.menu.addMenuItem(this._ui.intel);
        }
        if (switches.includes('nvidia')) {
            this._ui.nvidia = new PopupMenu.PopupMenuItem(_("NVidia"));
            this._ui.nvidia.connect('activate', this._handleMenuItemClick.bind(this));
            this.menu.addMenuItem(this._ui.nvidia);
        }
        if (switches.includes('on-demand')) {
            this._ui.demand = new PopupMenu.PopupMenuItem(_("NVidia On-Demand"));
            this._ui.demand.connect('activate', this._handleMenuItemClick.bind(this));
            this.menu.addMenuItem(this._ui.demand);
        }
        if (!switches.length)
            this.set_reactive(false);

        this._ui.separator = new PopupMenu.PopupSeparatorMenuItem();
        this.menu.addMenuItem(this._ui.separator);

        this._ui.messagePending = new PopupMenu.PopupMenuItem(_("Please wait for the operation\nto complete"));
        this._ui.messagePending.setSensitive(false);
        this.menu.addMenuItem(this._ui.messagePending);

        //this._ui.messageRestart = new PopupMenu.PopupMenuItem(_("Please restart the system\nto apply the changes"));
        this._ui.messageRestart = new PopupMenu.PopupMenuItem(_("Please log out and log back in\nto apply the changes"));
        this._ui.messageRestart.setSensitive(false);
        this.menu.addMenuItem(this._ui.messageRestart);

        this._ui.messageLoggingOut = new PopupMenu.PopupMenuItem(_("Logging out..."));
        this._ui.messageLoggingOut.setSensitive(false);
        this.menu.addMenuItem(this._ui.messageLoggingOut);

        //this._ui.preferences = new PopupMenu.PopupMenuItem(_("Preferences"));
        //this._ui.preferences.connect('activate', (actor, event) => {
        //    ExtensionUtils.openPrefs();
        //});
        //this.menu.addMenuItem(this._ui.preferences);

        this._attach();
        this._refresh();

        if (!this.switch.command('sudo'))
            this._log('can\'t find sudo frontend command, switch disabled');
        if (!this.switch.command('select'))
            this._log('can\'t find prime-select command, query/switch disabled');
        if (!this.switch.command('management'))
            this._log('can\'t find prime-smi command, logout notification disabled');
        if (!this.switch.command('settings'))
            this._log('can\'t find nvidia-settings command, settings disabled');
        if (!switches.length)
            this._log('can\'t find any prime switch, select disabled');
    }

    /**
     * Destructor.
     *
     * @return {Void}
     */
    destroy() {
        this.switch.destroy();
        this.settings.run_dispose();

        this._delayClear();

        delete this._loggingOut;
        delete this._pending;
        delete this._timeoutSourceId
        delete this._switch;
        delete this._settings;

        super.destroy();
    }

    /**
     * Settings property getter.
     *
     * @return {Gio.Settings}
     */
    get settings() {
        return this._settings;
    }

    /**
     * Switch property getter.
     *
     * @return {Prime.Switch}
     */
    get switch() {
        return this._switch;
    }

    /**
     * Logout gnome session.
     *
     * @return {Void}
     */
    logout() {
        let sessionManager = new GnomeSession.SessionManager(),
            mode = 1;
            // 0: Normal.
            // 1: No confirmation inferface should be shown.
            // 2: Forcefully logout. No confirmation will be shown and any inhibitors will be ignored.

        this._log('gnome session logout');
        sessionManager.LogoutRemote(mode);
    }

    /**
     * Proxy for global.log().
     *
     * @param  {...String} message
     * @return {Void}
     */
    _log(...message) {
        Log.journal('Menu.Widget', message);
    }

    /**
     * Attach widget to aggregate menu.
     *
     * @return {Void}
     */
    _attach() {
        let items = Main.panel.statusArea.aggregateMenu.menu._getMenuItems();
        Main.panel.statusArea.aggregateMenu.menu.addMenuItem(this, items.length - 1);
    }

    /**
     * Clear any main loop timeout sources.
     *
     * @return {Void}
     */
    _delayClear() {
        if (!this._timeoutSourceId)
            return;

        GLib.Source.remove(this._timeoutSourceId);
        this._timeoutSourceId = null;
    }

    /**
     * Execute callback with delay.
     *
     * @param  {Number}   timeout
     * @param  {Function} callback
     * @param  {...Mixed} args
     * @return {Void}
     */
    _delayExecute(timeout, callback, ...args) {
        if (this._timeoutSourceId)
            throw new Error('Timeout already in use');

        this._timeoutSourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, timeout, () => {
            this._timeoutSourceId = null;

            if (typeof callback === 'function')
                callback.apply(this, args);

            // Stop repeating.
            return GLib.SOURCE_REMOVE;
        });
    }

    /**
     * Refresh widget menu:
     * set items sensitivity and show/hide logout message.
     *
     * @return {Void}
     */
    _refresh() {
        let query = this.switch.query,
            pending = this._pending,
            loggingOut = this._loggingOut,
            isRestartNeeded = this.switch.isRestartNeeded,
            sensitive = (!pending && !loggingOut) ? this.switch.command('sudo') && this.switch.command('select') : false;

        if (this._ui.nvidia) {
            this._ui.nvidia.setSensitive(sensitive);
            this._ui.nvidia.setOrnament(query === 'nvidia' ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE);
        }
        if (this._ui.intel) {
            this._ui.intel.setSensitive(sensitive);
            this._ui.intel.setOrnament(query === 'intel' ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE);
        }
        if (this._ui.demand) {
            this._ui.demand.setSensitive(sensitive);
            this._ui.demand.setOrnament(query === 'on-demand' ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE);
        }

        this._ui.separator.actor.visible = pending || isRestartNeeded || loggingOut;
        this._ui.messagePending.actor.visible = loggingOut ? false : pending;
        this._ui.messageRestart.actor.visible = (loggingOut || pending) ? false : isRestartNeeded;
        this._ui.messageLoggingOut.actor.visible = loggingOut;
    }

    /**
     * Switch GPU.
     *
     * @param  {String} gpu
     * @return {Void}
     */
    _switchGpu(gpu) {
        this._pending = true;
        this._refresh();

        this.switch.switch(gpu, (e) => {
            let doRestart = true
                && e.result
                && this.settings.get_boolean('auto-logout')
                && this.switch.isRestartNeeded;
            if (!doRestart) {
                this._pending = false;
                this._refresh();

                return;
            }

            this._log('logout on gpu switch enabled, logging out');
            this._pending = false;
            this._loggingOut = true;
            this._refresh();

            // Logout with delay.
            this._delayExecute(1000, this.logout.bind(this));
        });
    }

    /**
     * Settings changed event handler.
     *
     * @param  {Object} actor
     * @param  {String} key
     * @return {Void}
     */
    _handleSettings(actor, key) {
        // pass
    }

    /**
     * Menu item click event handler.
     *
     * @param  {PopupMenuItem} widget
     * @param  {Clutter.Event} event
     * @return {Void}
     */
    _handleMenuItemClick(actor, event) {
        if (actor._ornament !== PopupMenu.Ornament.NONE)
            return;

        let gpu = null;
        if (this._ui.nvidia && this._ui.nvidia === actor)
            gpu = 'nvidia';
        else if (this._ui.intel && this._ui.intel === actor)
            gpu = 'intel';
        else if (this._ui.demand && this._ui.demand === actor)
            gpu = 'on-demand';
        else
            throw new Error('Unknown GPU switch');

        // Switch with delay, making sure that refresh occurs after aggregate
        // menu fadeout.
        this._delayExecute(50, this._switchGpu.bind(this), gpu);
    }

    /**
     * Prime switch gpu change event handler.
     *
     * @param  {Object} actor
     * @param  {String} gpu
     * @return {Void}
     */
    _handlePrimeGpuChange(actor, gpu) {
        this._refresh();
    }

    /* --- */
});
