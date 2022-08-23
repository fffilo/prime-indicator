/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Widget = Me.imports.libs.prefs.widget;

/**
 * Extension preferences initialization.
 *
 * @return {Void}
 */
var init = () => {
    ExtensionUtils.initTranslations(Me.metadata['gettext-domain']);
}

/**
 * Extension preferences build widget.
 *
 * @return {Void}
 */
var buildPrefsWidget = () => {
    return new Widget.Widget();
}
