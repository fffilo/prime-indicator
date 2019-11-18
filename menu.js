/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const Lang = imports.lang;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const System = Main.panel.statusArea.aggregateMenu._system;
const GnomeSession = imports.misc.gnomeSession;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Prime = Me.imports.prime;
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
var Widget = new Lang.Class({

    Name: 'PrimeIndicator.Menu.Widget',
    Extends: PopupMenu.PopupSubMenuMenuItem,

    /**
     * Constructor
     *
     * @return {Void}
     */
    _init: function() {
        this.parent(_("Prime Select"), true);

        this.settings = Settings.settings();
        this.settings.connect('changed', Lang.bind(this, this._handle_settings));

        this.switch = new Prime.Switch();
        this.switch.connect('gpu-change', Lang.bind(this, this._handle_prime_gpu_change));
        this.switch.monitor();

        this.ui = {};
        this.ui.intel = new PopupMenu.PopupMenuItem(_("Intel"));
        this.ui.intel.connect('activate', Lang.bind(this, this._handle_menu_item_click, 'intel'));
        this.ui.nvidia = new PopupMenu.PopupMenuItem(_("NVidia"));
        this.ui.nvidia.connect('activate', Lang.bind(this, this._handle_menu_item_click, 'nvidia'));
        this.ui.message = new PopupMenu.PopupMenuItem(_("Please log out and log back\nin to apply the changes"));
        this.ui.message.setSensitive(false);

        this.menu.addMenuItem(this.ui.intel);
        this.menu.addMenuItem(this.ui.nvidia);
        //this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addMenuItem(this.ui.message);

        this.icon.icon_name = 'prime-menu-default-symbolic';
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
    },

    /**
     * Destructor
     *
     * @return {Void}
     */
    destroy: function() {
        this.switch.destroy();
        this.settings.run_dispose();
        this.parent();
    },

    /**
     * Logout gnome session
     *
     * @return {Void}
     */
    logout: function() {
        let sessionManager = System._session || new GnomeSession.SessionManager();
        let mode = 1;
        // 0: Normal.
        // 1: No confirmation inferface should be shown.
        // 2: Forcefully logout. No confirmation will be shown and any inhibitors will be ignored.

        this._log('gnome session logout');
        sessionManager.LogoutRemote(mode);
    },

    /**
     * Proxy for global.log()
     *
     * @param  {String} message
     * @return {Void}
     */
    _log: function(message) {
        let args = Array.prototype.slice.call(arguments);
        args.unshift('Menu.Widget');

        Log.journal.apply(Log.journal, args);
    },

    /**
     * Refresh widget menu:
     * set items sensitivity and
     * show/hide logout message
     *
     * @return {Void}
     */
    _refresh: function() {
        let gpu = this.switch.gpu;
        let query = this.switch.query;
        let sudo = this.switch.command('sudo');
        let select = this.switch.command('select');

        this.ui.intel.setSensitive(sudo && select);
        this.ui.intel.setOrnament(query === 'intel' ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE);
        this.ui.nvidia.setSensitive(sudo && select);
        this.ui.nvidia.setOrnament(query === 'nvidia' ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE);
        this.ui.message.actor.visible = gpu !== 'unknown' && gpu !== query && select;
    },

    /**
     * Settings changed event handler
     *
     * @param  {Object} actor
     * @param  {String} key
     * @return {Void}
     */
    _handle_settings: function(actor, key) {
        // pass
    },

    /**
     * Menu item click event handler
     *
     * @param  {Object} actor
     * @param  {Object} event
     * @param  {String} gpu
     * @return {Void}
     */
    _handle_menu_item_click: function(actor, event, gpu) {
        if (actor._ornament !== PopupMenu.Ornament.NONE)
            return;

        this.switch.switch(gpu, Lang.bind(this, function(e) {
            if (!this.settings.get_boolean('auto-logout'))
                return;
            if (!e.result)
                return;

            this._log('logout on gpu switch enabled, logging out')
            this.logout();
        }));
    },

    /**
     * Prime switch gpu change event handler
     *
     * @param  {Object} actor
     * @param  {String} gpu
     * @return {Void}
     */
    _handle_prime_gpu_change: function(actor, gpu) {
        this._refresh();
    },

    /* --- */

});
