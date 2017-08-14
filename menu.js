/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const Lang = imports.lang;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Prime = Me.imports.prime;
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
const Widget = new Lang.Class({

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
     * Refresh widget menu:
     * set items sensitivity and
     * show/hide logout message
     *
     * @return {Void}
     */
    _refresh: function() {
        let gpu = this.switch.gpu;
        let query = this.switch.query;
        let commands = this.switch.commands;

        this.ui.intel.setSensitive(commands.sudo && commands.prime);
        this.ui.intel.setOrnament(query === 'intel' ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE);
        this.ui.nvidia.setSensitive(commands.sudo && commands.prime);
        this.ui.nvidia.setOrnament(query === 'nvidia' ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE);
        this.ui.message.actor.visible = gpu !== query && commands.prime && commands.glxinfo;
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

        this.switch.switch(gpu, this.settings.get_boolean('auto-logout'));
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
