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
 * Fill the preferences window (Adw.PreferencesWindow).
 *
 * @param  {ExtensionPrefsDialog} window
 * @return {Void}
 */
var fillPreferencesWindow = (window) => {
    new Widget.Widget(window);
}
