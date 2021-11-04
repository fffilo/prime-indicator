/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// Import modules.
const {GObject, Gtk, Gdk, GdkPixbuf, GLib} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Icons = Me.imports.icons;
const Settings = Me.imports.settings;
const Translation = Me.imports.translation;
const _ = Translation.translate;

/**
 * Extension preferences initialization.
 *
 * @return {Void}
 */
var init = () => {
    Translation.init();
}

/**
 * Extension preferences build widget.
 *
 * @return {Void}
 */
var buildPrefsWidget = () => {
    return new Widget();
}

/**
 * Widget extends Gtk.Box.
 */
const Widget = GObject.registerClass({
    GTypeName: 'PrimeIndicatorPrefsWidget',
}, class Widget extends Gtk.Box {
    /**
     * Constructor.
     *
     * @return {Void}
     */
    _init() {
        super._init({ orientation: Gtk.Orientation.VERTICAL, });

        this._settings = Settings.settings();
        //this.settings.connect('changed', this._handle_settings.bind(this));

        let provider = new Gtk.CssProvider();
        provider.load_from_path(Me.dir.get_path() + '/prefs.css');
        Gtk.StyleContext.add_provider_for_display(Gdk.Display.get_default(), provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);

        let notebook = new Gtk.Notebook();
        notebook.set_vexpand(true);
        notebook.append_page(this._createPageSettings(), new Gtk.Label({ label: _("Settings"), }));
        notebook.append_page(this._createPageAbout(), new Gtk.Label({ label: _("About"), }));
        this.append(notebook);

        if (typeof this.show_all === 'function')
            this.show_all();
    }

    /**
     * Destructor.
     *
     * @return {Void}
     */
    destroy() {
        this.settings.run_dispose();

        delete this._settings;

        super.destroy();
    }

    /**
     * Settings property getter.
     *
     * @return {Gio.Settings}
     */
    get settings() {
        return this._settings;
    }

    /**
     * Create new page.
     *
     * @return {Box}
     */
    _createNewPage() {
        let page = new Box();
        page.expand = true;
        page.get_style_context().add_class('prime-indicator-prefs-page');

        return page;
    }

    /**
     * Create settings page.
     *
     * @return {Box}
     */
    _createPageSettings() {
        let page = this._createNewPage();
        page.get_style_context().add_class('prime-indicator-prefs-page-settings');

        let input = new InputSwitch('auto-logout', this.settings.get_boolean('auto-logout'), _("Logout on GPU switch"), _("Logout on GPU switch"));
        input.connect('changed', this._handleInputChange.bind(this));
        page.actor.append(input);

        input = new InputButton(_("Open"), _("NVIDIA Settings"));
        input.connect('changed', this._handleButtonChange.bind(this));
        page.actor.append(input);

        return page;
    }

    /**
     * Create about page.
     *
     * @return {Box}
     */
    _createPageAbout() {
        let page = this._createNewPage();
        page.get_style_context().add_class('prime-indicator-prefs-page-about');

        let item = new Label({ label: Me.metadata.name, });
        item.get_style_context().add_class('prime-indicator-prefs-page-about-title');
        page.actor.append(item);

        let ico = GdkPixbuf.Pixbuf.new_from_file_at_scale(Me.path + '/assets/%s.svg'.format(Icons.DEFAULT), 64, 64, null);
        item = Gtk.Image.new_from_pixbuf(ico);
        item.get_style_context().add_class('prime-indicator-prefs-page-about-icon');
        page.actor.append(item);

        item = new Label({ label: Me.metadata['description-html'] || Me.metadata.description, });
        item.get_style_context().add_class('prime-indicator-prefs-page-about-description');
        page.actor.append(item);

        item = new Label({ label: _("Version") + ': ' + Me.metadata.version, });
        item.get_style_context().add_class('prime-indicator-prefs-page-about-version');
        page.actor.append(item);

        item = new Label({ label: Me.metadata['original-author-html'] || Me.metadata['original-author'], });
        item.get_style_context().add_class('prime-indicator-prefs-page-about-author');
        page.actor.append(item);

        item = new Label({ label: '<a href="' + Me.metadata.url + '">' + Me.metadata.url + '</a>', });
        item.get_style_context().add_class('prime-indicator-prefs-page-about-webpage');
        page.actor.append(item);

        item = new Label({ label: Me.metadata['license-html'] || Me.metadata.license, });
        item.get_style_context().add_class('prime-indicator-prefs-page-about-license');
        page.actor.append(item);

        return page;
    }

    /**
     * `which $command` result.
     *
     * @param  {String} command
     * @return {Mixed}
     */
    _which(command) {
        let result = this._shellExec('which ' + command);
        if (result)
            result = result.trim();

        return result;
    }

    /**
     * Shell execute command.
     *
     * @param  {String} command
     * @return {Mixed}
     */
    _shellExec(command) {
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
    }

    /**
     * Shell execute command.
     *
     * @param  {String} command
     * @return {Void}
     */
    _shellExecAsync(command) {
        try {
            let [ok, pid] = GLib.spawn_async(null, command.split(' '), null, GLib.SpawnFlags.SEARCH_PATH, null);
            if (ok)
                return pid;
        }
        catch(e) {
            // pass
        }

        return null;
    }

    /**
     * Input widget change event handler.
     *
     * @param  {Object} actor
     * @param  {Object} event
     * @return {Void}
     */
    _handleInputChange(actor, event) {
        let old = this.settings['get_' + event.type](event.key);
        if (old != event.value)
            this.settings['set_' + event.type](event.key, event.value);
    }

    /**
     * Button NVIDIA Settings click event handler.
     *
     * @param  {Object} actor
     * @param  {Object} event
     * @return {Void}
     */
    _handleButtonChange(actor, event) {
        this._shellExecAsync('nvidia-settings');
    }

    /* --- */
});

/**
 * Box extends Gtk.Frame:
 * used so we can use padding property in css.
 */
const Box = GObject.registerClass({
    GTypeName: 'PrimeIndicatorPrefsBox',
}, class Box extends Gtk.Frame {
    /**
     * Constructor.
     *
     * @param  {Object} options (optional)
     * @return {Void}
     */
    _init() {
        super._init();

        this.actor = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, });
        this.set_child(this.actor);

        this.get_style_context().add_class('prime-indicator-prefs-box');
    }

    /* --- */
});

/**
 * Label extends Gtk.Label:
 * just a common Gtk.Label object with markup and line wrap.
 */
const Label = GObject.registerClass({
    GTypeName: 'PrimeIndicatorPrefsLabel',
}, class Label extends Gtk.Label {
    /**
     * Constructor.
     *
     * @param  {Object} options (optional)
     * @return {Void}
     */
    _init(options) {
        let o = options || {};
        if (!('label' in options)) o.label = 'undefined';

        super._init(o);
        this.set_markup(this.get_text());
        this.wrap = true;
        this.set_justify(Gtk.Justification.CENTER);

        this.get_style_context().add_class('prime-indicator-prefs-label');
    }

    /* --- */
});

/**
 * Input extends Box:
 * Box object with label and widget for editing settings.
 *
 * @param  {Object}
 * @return {Object}
 */
const Input = GObject.registerClass({
    GTypeName: 'PrimeIndicatorPrefsInput',
    Signals: {
        changed: {
            param_types: [ GObject.TYPE_OBJECT ],
        },
    },
}, class Input extends Box {
    /**
     * Constructor.
     *
     * @param  {String} key
     * @param  {String} text
     * @param  {String} tooltip
     * @return {Void}
     */
    _init(key, text, tooltip) {
        super._init();
        this.actor.set_orientation(Gtk.Orientation.HORIZONTAL);

        let label = new Gtk.Label({ label: text, xalign: 0, tooltip_text: tooltip || '' });
        label.set_hexpand(true);
        this.actor.append(label);

        this._key = key;
        this._label = label;
        this._widget = null;

        this.get_style_context().add_class('prime-indicator-prefs-input');
    }

    /**
     * Input change event handler.
     *
     * @param  {Object} widget
     * @return {Void}
     */
    _handleChange(widget) {
        let emit = new GObject.Object();
        emit.key = this.key;
        emit.value = this.value;
        emit.type = this.type;

        this.emit('changed', emit);
    }

    /**
     * Type property getter.
     *
     * @return {String}
     */
    get type() {
        return 'variant';
    }

    /**
     * Key property getter.
     *
     * @return {String}
     */
    get key() {
        return this._key;
    }

    /**
     * Enabled property getter.
     *
     * @return {Boolean}
     */
    get enabled() {
        return this._widget.is_sensitive();
    }

    /**
     * Enabled property setter.
     *
     * @param  {Boolean} value
     * @return {Void}
     */
    set enabled(value) {
        this._widget.set_sensitive(value);
    }

    /**
     * Value property getter.
     *
     * @return {Boolean}
     */
    get value() {
        return this._widget.value;
    }

    /**
     * Value property setter.
     *
     * @param  {Mixed} value
     * @return {Void}
     */
    set value(value) {
        this._widget.value = value;
    }

    /* --- */
});

/**
 * InputSwitch extends Input.
 */
const InputSwitch = GObject.registerClass({
    GTypeName: 'PrimeIndicatorPrefsInputSwitch',
}, class InputSwitch extends Input {
    /**
     * Constructor.
     *
     * @return {Void}
     */
    _init(key, value, text, tooltip) {
        super._init(key, text, tooltip);

        this._widget = new Gtk.Switch({ active: value });
        this._widget.connect('notify::active', this._handleChange.bind(this));
        this.actor.append(this._widget);

        this.get_style_context().add_class('prime-indicator-prefs-input-switch');
    }

    /**
     * Type property getter.
     *
     * @return {String}
     */
    get type() {
        return 'boolean';
    }

    /**
     * Value property getter.
     *
     * @return {Boolean}
     */
    get value() {
        return this._widget.active;
    }

    /**
     * Value property setter.
     *
     * @param  {Boolean} value
     * @return {Void}
     */
    set value(value) {
        this._widget.active = value;
    }

    /* --- */
});

/**
 * InputButton extends Input.
 */
const InputButton = GObject.registerClass({
    GTypeName: 'PrimeIndicatorPrefsInputButton',
}, class InputButton extends Input {
    /**
     * Constructor.
     *
     * @return {Void}
     */
    _init(label, text, tooltip) {
        super._init(null, text, tooltip);

        this._widget = new Gtk.Button({ label: label });
        this._widget.connect('clicked', this._handleChange.bind(this));
        this.actor.append(this._widget);

        this.get_style_context().add_class('prime-indicator-prefs-input-button');
    }

    /**
     * Value property getter.
     *
     * @return {Boolean}
     */
    get value() {
        return null;
    }

    /**
     * Value property setter.
     *
     * @param  {Boolean} value
     * @return {Void}
     */
    set value(value) {
        // pass
    }

    /* --- */
});
