/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// Strict mode.
'use strict';

// Import modules.
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Translation = Me.imports.translation;
const Menu = Me.imports.menu;

/**
 * Global widget object.
 *
 * @type {Object}
 */
let widget = null;

/**
 * Extension initialization.
 *
 * @param  {Object} extensionMeta
 * @return {Void}
 */
var init = (extensionMeta) => {
    Translation.init();
}

/**
 * Extension enable.
 *
 * @return {Void}
 */
var enable = () => {
    if (widget)
        return;

    widget = new Menu.Widget();
}

/**
 * Extension disable.
 *
 * @return {Void}
 */
var disable = () => {
    if (!widget)
        return;

    widget.destroy();
    widget = null;
}
