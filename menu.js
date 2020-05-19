/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const GObject = imports.gi.GObject;
const Main = imports.ui.main;
const System = Main.panel.statusArea.aggregateMenu._system;
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
 * Widget constructor
 * extends PopupMenu.PopupSeparatorMenuItem
 *
 * @param  {Object}
 * @return {Object}
 */
var Widget = GObject.registerClass(class Widget extends PopupMenu.PopupSubMenuMenuItem {

    /**
     * Constructor
     *
     * @return {Void}
     */
    _init() {
        super._init(_("Prime Select"), true);

        this.settings = Settings.settings();
        this.settings.connect('changed', this._handleSettings.bind(this));

        this.switch = new Prime.Switch();
        this.switch.connect('gpu-change', this._handlePrimeGpuChange.bind(this));
        this.switch.monitor();

        this.ui = {};
        let switches = this.switch.switches;
        if (switches.includes('nvidia')) {
            this.ui.nvidia = new PopupMenu.PopupMenuItem(_("NVidia"));
            this.ui.nvidia.connect('activate', this._handleMenuItemClick.bind(this));
            this.menu.addMenuItem(this.ui.nvidia);
        }
        if (switches.includes('intel')) {
            this.ui.intel = new PopupMenu.PopupMenuItem(_("Intel"));
            this.ui.intel.connect('activate', this._handleMenuItemClick.bind(this));
            this.menu.addMenuItem(this.ui.intel);
        }
        if (switches.includes('on-demand')) {
            this.ui.demand = new PopupMenu.PopupMenuItem(_("On-Demand"));
            this.ui.demand.connect('activate', this._handleMenuItemClick.bind(this));
            this.menu.addMenuItem(this.ui.demand);
        }

        this.ui.message = new PopupMenu.PopupMenuItem(_("Please log out and log back\nin to apply the changes"));
        this.ui.message.setSensitive(false);
        this.menu.addMenuItem(this.ui.message);

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
    }

    /**
     * Destructor
     *
     * @return {Void}
     */
    destroy() {
        this.switch.destroy();
        this.settings.run_dispose();
        this.parent();
    }

    /**
     * Logout gnome session
     *
     * @return {Void}
     */
    logout() {
        let sessionManager = System._session || new GnomeSession.SessionManager(),
            mode = 1;
            // 0: Normal.
            // 1: No confirmation inferface should be shown.
            // 2: Forcefully logout. No confirmation will be shown and any inhibitors will be ignored.

        this._log('gnome session logout');
        sessionManager.LogoutRemote(mode);
    }

    /**
     * Proxy for global.log()
     *
     * @param  {String} message
     * @return {Void}
     */
    _log(message) {
        let args = Array.prototype.slice.call(arguments);
        args.unshift('Menu.Widget');

        Log.journal.apply(Log.journal, args);
    }

    /**
     * Refresh widget menu:
     * set items sensitivity and
     * show/hide logout message
     *
     * @return {Void}
     */
    _refresh() {
        let gpu = this.switch.gpu,
            query = this.switch.query,
            sudo = this.switch.command('sudo'),
            select = this.switch.command('select');

        if (this.ui.nvidia) {
            this.ui.nvidia.setSensitive(sudo && select);
            this.ui.nvidia.setOrnament(query === 'nvidia' ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE);
        }
        if (this.ui.intel) {
            this.ui.intel.setSensitive(sudo && select);
            this.ui.intel.setOrnament(query === 'intel' ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE);
        }
        if (this.ui.demand) {
            this.ui.demand.setSensitive(sudo && select);
            this.ui.demand.setOrnament(query === 'on-demand' ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE);
        }

        this.ui.message.actor.visible = gpu !== 'unknown' && gpu !== query && select;
    }

    /**
     * Settings changed event handler
     *
     * @param  {Object} actor
     * @param  {String} key
     * @return {Void}
     */
    _handleSettings(actor, key) {
        // pass
    }

    /**
     * Menu item click event handler
     *
     * @param  {Object} actor
     * @param  {Object} event
     * @return {Void}
     */
    _handleMenuItemClick(actor, event) {
        if (actor._ornament !== PopupMenu.Ornament.NONE)
            return;

        let gpu = null;
        if (this.ui.nvidia && this.ui.nvidia === actor)
            gpu = 'nvidia';
        else if (this.ui.intel && this.ui.intel === actor)
            gpu = 'intel';
        else if (this.ui.demand && this.ui.demand === actor)
            gpu = 'on-demand';
        else
            throw new Error('Unknown GPU switch');

        this.switch.switch(gpu, function(e) {
            if (!this.settings.get_boolean('auto-logout'))
                return;
            if (!e.result)
                return;

            this._log('logout on gpu switch enabled, logging out')
            this.logout();
        }.bind(this));
    }

    /**
     * Prime switch gpu change event handler
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
