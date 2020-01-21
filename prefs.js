/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// import modules
const Lang = imports.lang;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GdkPixbuf = imports.gi.GdkPixbuf;
const GLib = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Icons = Me.imports.icons;
const Settings = Me.imports.settings;
const Translation = Me.imports.translation;
const _ = Translation.translate;

/**
 * Extension preferences initialization
 *
 * @return {Void}
 */
function init() {
    Translation.init();
}

/**
 * Extension preferences build widget
 *
 * @return {Void}
 */
function buildPrefsWidget() {
    return new Widget();
}

/**
 * Widget constructor
 * extends Gtk.Box
 *
 * @param  {Object}
 * @return {Object}
 */
const Widget = new GObject.Class({

    Name: 'PrimeIndicator.Prefs.Widget',
    GTypeName: 'PrimeIndicatorPrefsWidget',
    Extends: Gtk.VBox,

    /**
     * Constructor
     *
     * @return {Void}
     */
    _init: function() {
        this.parent();

        this.settings = Settings.settings();
        //this.settings.connect('changed', Lang.bind(this, this._handle_settings));

        let css = new Gtk.CssProvider();
        css.load_from_path(Me.path + '/prefs.css');
        Gtk.StyleContext.add_provider_for_screen(Gdk.Screen.get_default(), css, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);

        let notebook = new Gtk.Notebook();
        notebook.append_page(this._page_settings(), new Gtk.Label({ label: _("Settings"), }));
        notebook.append_page(this._page_about(), new Gtk.Label({ label: _("About"), }));
        this.add(notebook);

        this.show_all();
    },

    /**
     * Destructor
     *
     * @return {Void}
     */
    destroy: function() {
        this.settings.run_dispose();
        this.parent();
    },

    /**
     * Create new page
     *
     * @return {Object}
     */
    _page: function() {
        let page = new Box();
        page.expand = true;
        page.get_style_context().add_class('prime-indicator-prefs-page');

        return page;
    },

    /**
     * Create new settings page
     *
     * @return {Object}
     */
    _page_settings: function() {
        let page = this._page();
        page.get_style_context().add_class('prime-indicator-prefs-page-settings');

        let value = this.settings.get_boolean('auto-logout');
        let box = new Box();
        let label = new Gtk.Label({ label: _("Logout on GPU switch"), xalign: 0, tooltip_text: '' });
        let input = new Gtk.Switch({ active: value });
        input.connect('notify::active', Lang.bind(this, this._handle_input_change));
        box.actor.set_orientation(Gtk.Orientation.HORIZONTAL);
        box.actor.pack_start(label, true, true, 0);
        box.actor.add(input);
        page.actor.add(box);

        box = new Box();
        label = new Gtk.Label({ label: _("NVIDIA Settings"), xalign: 0, tooltip_text: '' });
        input = new Gtk.Button({ label: _("Open"), expand: false });
        input.set_sensitive(this._which('nvidia-settings'));
        input.connect('clicked', Lang.bind(this, this._handle_nvidia_settings));
        box.actor.set_orientation(Gtk.Orientation.HORIZONTAL);
        box.actor.pack_start(label, true, true, 0);
        box.actor.add(input);
        page.actor.add(box);

        return page;
    },

    /**
     * Create new about page
     *
     * @return {Object}
     */
    _page_about: function() {
        let page = this._page();
        page.get_style_context().add_class('prime-indicator-prefs-page-about');

        let item = new Label({ label: Me.metadata.name, });
        item.get_style_context().add_class('prime-indicator-prefs-page-about-title');
        page.actor.add(item);

        let ico = GdkPixbuf.Pixbuf.new_from_file_at_scale(Me.path + '/assets/%s.svg'.format(Icons.DEFAULT), 64, 64, null);
        item = Gtk.Image.new_from_pixbuf(ico);
        item.get_style_context().add_class('prime-indicator-prefs-page-about-icon');
        page.actor.add(item);

        item = new Label({ label: Me.metadata['description-html'] || Me.metadata.description, });
        item.get_style_context().add_class('prime-indicator-prefs-page-about-description');
        page.actor.add(item);

        item = new Label({ label: _("Version") + ': ' + Me.metadata.version, });
        item.get_style_context().add_class('prime-indicator-prefs-page-about-version');
        page.actor.add(item);

        item = new Label({ label: Me.metadata['original-author-html'] || Me.metadata['original-author'], });
        item.get_style_context().add_class('prime-indicator-prefs-page-about-author');
        page.actor.add(item);

        item = new Label({ label: '<a href="' + Me.metadata.url + '">' + Me.metadata.url + '</a>', });
        item.get_style_context().add_class('prime-indicator-prefs-page-about-webpage');
        page.actor.add(item);

        item = new Label({ label: Me.metadata['license-html'] || Me.metadata.license, });
        item.get_style_context().add_class('prime-indicator-prefs-page-about-license');
        page.actor.pack_end(item, false, false, 0);

        return page;
    },

    /**
     * `which $command` result
     *
     * @param  {String} command
     * @return {Mixed}
     */
    _which: function(command) {
        let result = this._shell_exec('which ' + command);
        if (result)
            result = result.trim();

        return result;
    },

    /**
     * Shell execute command
     *
     * @param  {String} command
     * @return {Mixed}
     */
    _shell_exec: function(command) {
        try {
            let [ok, output, error, status] = GLib.spawn_sync(null, command.split(' '), null, GLib.SpawnFlags.SEARCH_PATH, null);
            if (ok) {
                if (output instanceof Uint8Array)
                    output = String.fromCharCode.apply(null, output);

                return output.toString().trim();
            }
        }
        catch(e) {
            // pass
        }

        return null;
    },

    /**
     * Shell execute command
     *
     * @param  {String} command
     * @return {Void}
     */
    _shell_exec_async: function(command) {
        try {
            let [ok, pid] = GLib.spawn_async(null, command.split(' '), null, GLib.SpawnFlags.SEARCH_PATH, null);
            if (ok)
                return pid;
        }
        catch(e) {
            // pass
        }

        return null;
    },

    /**
     * Input widget change event handler
     *
     * @param  {Object} actor
     * @param  {Object} event
     * @return {Void}
     */
    _handle_input_change: function(actor, event) {
        this.settings.set_boolean('auto-logout', actor.active);
    },

    /**
     * Button NVIDIA Settings click event handler
     *
     * @param  {Object} actor
     * @param  {Object} event
     * @return {Void}
     */
    _handle_nvidia_settings: function(actor, event) {
        this._shell_exec_async('nvidia-settings');
    },

});

/**
 * Box constructor
 * extends Gtk.Frame
 *
 * used so we can use padding
 * property in css
 *
 * to add widget to Box use
 * actor
 *
 * @param  {Object}
 * @return {Object}
 */
const Box = new GObject.Class({

    Name: 'PrimeIndicator.Prefs.Box',
    GTypeName: 'PrimeIndicatorPrefsBox',
    Extends: Gtk.Frame,

    _init: function() {
        this.parent();

        this.actor = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, });
        this.add(this.actor);
    },

    /* --- */

});

/**
 * Label constructor
 * extends Gtk.Label
 *
 * just a common Gtk.Label object
 * with markup and line wrap
 *
 * @param  {Object}
 * @return {Object}
 */
const Label = new GObject.Class({

    Name: 'PrimeIndicator.Prefs.Label',
    GTypeName: 'PrimeIndicatorPrefsLabel',
    Extends: Gtk.Label,

    /**
     * Constructor
     *
     * @param  {Object} options (optional)
     * @return {Void}
     */
    _init: function(options) {
        let o = options || {};
        if (!('label' in options)) o.label = 'undefined';

        this.parent(o);
        this.set_markup(this.get_text());
        this.set_line_wrap(true);
        this.set_justify(Gtk.Justification.CENTER);
    },

    /* --- */

});
