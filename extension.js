/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// Strict mode.
'use strict';

// Import modules.
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
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
    ExtensionUtils.initTranslations();
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
