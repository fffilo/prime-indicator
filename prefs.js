/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// import modules
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
        //this.settings.connect('changed', this._handle_settings.bind(this));

        let css = new Gtk.CssProvider();
        css.load_from_path(Me.path + '/prefs.css');
        Gtk.StyleContext.add_provider_for_screen(Gdk.Screen.get_default(), css, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);

        let notebook = new Gtk.Notebook();
        notebook.append_page(this._pageSettings(), new Gtk.Label({ label: _("Settings"), }));
        notebook.append_page(this._pageAbout(), new Gtk.Label({ label: _("About"), }));
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
    _pageSettings: function() {
        let page = this._page();
        page.get_style_context().add_class('prime-indicator-prefs-page-settings');

        let input = new InputSwitch('auto-logout', this.settings.get_boolean('auto-logout'), _("Logout on GPU switch"), _("Logout on GPU switch"));
        input.connect('changed', this._handleInputChange.bind(this));
        page.actor.add(input);

        input = new InputButton(_("Open"), _("NVIDIA Settings"));
        input.connect('changed', this._handle_button_change.bind(this));
        page.actor.add(input);

        return page;
    },

    /**
     * Create new about page
     *
     * @return {Object}
     */
    _pageAbout: function() {
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
        let result = this._shellExec('which ' + command);
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
    _shellExec: function(command) {
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
    _shellExecAsync: function(command) {
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
    _handleInputChange: function(actor, event) {
        let old = this.settings['get_' + event.type](event.key);
        if (old != event.value)
            this.settings['set_' + event.type](event.key, event.value);
    },

    /**
     * Button NVIDIA Settings click event handler
     *
     * @param  {Object} actor
     * @param  {Object} event
     * @return {Void}
     */
    _handle_button_change: function(actor, event) {
        this._shellExecAsync('nvidia-settings');
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

        this.get_style_context().add_class('prime-indicator-prefs-box');
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

        this.get_style_context().add_class('prime-indicator-prefs-label');
    },

    /* --- */

});

/**
 * Input constructor
 * extends Box
 *
 * horizontal Gtk.Box object with label
 * and widget for editing settings
 *
 * @param  {Object}
 * @return {Object}
 */
const Input = new GObject.Class({

    Name: 'Prefs.Input',
    GTypeName: 'PrimeIndicatorPrefsInput',
    Extends: Box,
    Signals: {
        changed: {
            param_types: [ GObject.TYPE_OBJECT ],
        },
    },

    /**
     * Constructor
     *
     * @param  {String} key
     * @param  {String} text
     * @param  {String} tooltip
     * @return {Void}
     */
    _init: function(key, text, tooltip) {
        this.parent();
        this.actor.set_orientation(Gtk.Orientation.HORIZONTAL);

        this._key = key;
        this._label = new Gtk.Label({ label: text, xalign: 0, tooltip_text: tooltip || '' });
        this._widget = null;

        this.actor.pack_start(this._label, true, true, 0);

        this.get_style_context().add_class('prime-indicator-prefs-input');
    },

    /**
     * Input change event handler
     *
     * @param  {Object} widget
     * @return {Void}
     */
    _handleChange: function(widget) {
        let emit = new GObject.Object();
        emit.key = this.key;
        emit.value = this.value;
        emit.type = this.type;

        this.emit('changed', emit);
    },

    /**
     * Type getter
     *
     * @return {String}
     */
    get type() {
        return 'variant';
    },

    /**
     * Key getter
     *
     * @return {String}
     */
    get key() {
        return this._key;
    },

    /**
     * Enabled getter
     *
     * @return {Boolean}
     */
    get enabled() {
        return this._widget.is_sensitive();
    },

    /**
     * Enabled setter
     *
     * @param  {Boolean} value
     * @return {Void}
     */
    set enabled(value) {
        this._widget.set_sensitive(value);
    },

    /**
     * Value getter
     *
     * @return {Boolean}
     */
    get value() {
        return this._widget.value;
    },

    /**
     * Value setter
     *
     * @param  {Mixed} value
     * @return {Void}
     */
    set value(value) {
        this._widget.value = value;
    },

    /* --- */

});

/**
 * InputSwitch constructor
 * extends Input
 *
 * @param  {Object}
 * @return {Object}
 */
const InputSwitch = new GObject.Class({

    Name: 'Prefs.InputSwitch',
    GTypeName: 'PrimeIndicatorPrefsInputSwitch',
    Extends: Input,

    /**
     * Constructor
     *
     * @return {Void}
     */
    _init: function(key, value, text, tooltip) {
        this.parent(key, text, tooltip);

        this._widget = new Gtk.Switch({ active: value });
        this._widget.connect('notify::active', this._handleChange.bind(this));
        this.actor.add(this._widget);

        this.get_style_context().add_class('prime-indicator-prefs-input-switch');
    },

    /**
     * Type getter
     *
     * @return {String}
     */
    get type() {
        return 'boolean';
    },

    /**
     * Value getter
     *
     * @return {Boolean}
     */
    get value() {
        return this._widget.active;
    },

    /**
     * Value setter
     *
     * @param  {Boolean} value
     * @return {Void}
     */
    set value(value) {
        this._widget.active = value;
    },

    /* --- */

});

/**
 * InputButton constructor
 * extends Input
 *
 * @param  {Object}
 * @return {Object}
 */
const InputButton = new GObject.Class({

    Name: 'Prefs.InputButton',
    GTypeName: 'PrimeIndicatorPrefsInputButton',
    Extends: Input,

    /**
     * Constructor
     *
     * @return {Void}
     */
    _init: function(label, text, tooltip) {
        this.parent(null, text, tooltip);

        this._widget = new Gtk.Button({ label: label, expand: false });
        this._widget.connect('clicked', this._handleChange.bind(this));
        this.actor.add(this._widget);

        this.get_style_context().add_class('prime-indicator-prefs-input-button');
    },

    /**
     * Value getter
     *
     * @return {Boolean}
     */
    get value() {
        return null;
    },

    /**
     * Value setter
     *
     * @param  {Boolean} value
     * @return {Void}
     */
    set value(value) {
        // pass
    },

    /* --- */

});
