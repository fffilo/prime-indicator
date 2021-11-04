/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// Strict mode.
'use strict';

// Import modules.
const GObject = imports.gi.GObject;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const GnomeSession = imports.misc.gnomeSession;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Prime = Me.imports.prime;
const Icons = Me.imports.icons;
const Log = Me.imports.log;
const Settings = Me.imports.settings;
const Translation = Me.imports.translation;
const _ = Translation.translate;

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

        this._settings = Settings.settings();
        this.settings.connect('changed', this._handleSettings.bind(this));

        this._switch = new Prime.Switch();
        this.switch.connect('gpu-change', this._handlePrimeGpuChange.bind(this));
        this.switch.monitor();

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

        this._ui.message = new PopupMenu.PopupMenuItem(_("Please log out and log back\nin to apply the changes"));
        this._ui.message.setSensitive(false);
        this.menu.addMenuItem(this._ui.message);

        //this._ui.preferences = new PopupMenu.PopupMenuItem(_("Preferences"));
        //this._ui.preferences.connect('activate', (actor, event) => {
        //    if (typeof ExtensionUtils.openPrefs === 'function')
        //        ExtensionUtils.openPrefs();
        //    else
        //        Util.spawn(['gnome-shell-extension-prefs', Me.metadata.uuid]);
        //});
        //this.menu.addMenuItem(this._ui.preferences);

        this.icon.set_gicon(new Icons.Icon(Icons.DEFAULT));
        let items = Main.panel.statusArea.aggregateMenu.menu._getMenuItems();
        Main.panel.statusArea.aggregateMenu.menu.addMenuItem(this, items.length - 1);

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
     * Refresh widget menu:
     * set items sensitivity and show/hide logout message.
     *
     * @return {Void}
     */
    _refresh() {
        let query = this.switch.query,
            sensitive = this.switch.command('sudo') && this.switch.command('select'),
            needsRestart = this.switch.needsRestart;

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

        this._ui.separator.actor.visible = needsRestart;
        this._ui.message.actor.visible = needsRestart;
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

        this.switch.switch(gpu, (e) => {
            if (!this.settings.get_boolean('auto-logout'))
                return;
            if (!e.result)
                return;

            this._log('logout on gpu switch enabled, logging out')
            this.logout();
        });
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
