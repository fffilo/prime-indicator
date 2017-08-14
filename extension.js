/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Translation = Me.imports.translation;
const Icons = Me.imports.icons;
const Menu = Me.imports.menu;

/**
 * Global widget object
 *
 * @type {Object}
 */
let widget = null;

/**
 * Extension initialization
 *
 * @param  {Object} extensionMeta
 * @return {Void}
 */
function init(extensionMeta) {
    Translation.init();
    Icons.init();
}

/**
 * Extension enable
 *
 * @return {Void}
 */
function enable() {
    if (widget)
        return;

    widget = new Menu.Widget();
}

/**
 * Extension disable
 *
 * @return {Void}
 */
function disable() {
    if (!widget)
        return;

    widget.destroy();
    widget = null;
}
