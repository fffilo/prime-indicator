/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const Lang = imports.lang;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Signals = imports.signals;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/**
 * Path of prime status file
 *
 * @type {String}
 */
const INDEX = '/etc/prime-discrete';

/**
 * Switch constructor:
 * prime profiles manipulation
 *
 * @param  {Object}
 * @return {Object}
 */
const Switch = new Lang.Class({

    Name: 'PrimeIndicator.Prime.Switch',

    /**
     * Constructor
     *
     * @return {Void}
     */
    _init: function() {
        this.listener = null;
        this.commands = null;

        this._commands();
    },

    /**
     * Destructor
     *
     * @return {Void}
     */
    destroy: function() {
        this.unmonitor();
    },

    /**
     * Get shell commands
     *
     * @return {Void}
     */
    _commands: function() {
        this.commands = {
            sudo: this._which('pkexec') || this._which('gksudo'),
            bash: this._which('bash'),
            glxinfo: this._which('glxinfo'),
            prime: this._which('prime-select'),
            settings: this._which('nvidia-settings'),
            switch: Me.path + '/prime-proxy',
        }

        if (!this.commands.sudo) this._log('can\'t find sudo frontend command, switch disabled');
        if (!this.commands.glxinfo) this._log('can\'t find glxinfo command, gpu disabled');
        if (!this.commands.prime) this._log('can\'t find prime-select command, query/switch disabled');
        if (!this.commands.settings) this._log('can\'t find nvidia-settings command, settings disabled');
    },

    /**
     * Proxy for global.log()
     *
     * @param  {String} message
     * @return {Void}
     */
    _log: function(message) {
        let args = ['PrimeIndicator.Prime.Switch'];
        args.push.apply(args, arguments);

        global.log.apply(global, args);
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
            if (ok)
                return output.toString();
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
     * Simple regex match
     *
     * @param  {String}  pattern
     * @param  {String}  source
     * @return {Boolean}
     */
    _regex_match: function(pattern, source) {
        return GLib.Regex.match_simple(pattern, source, GLib.RegexCompileFlags.CASELESS, GLib.RegexMatchFlags.NOTEOL);
    },

    /**
     * Property gpu getter:
     * current GPU from `glxinfo` shell command
     *
     * @return {String}
     */
    get gpu() {
        if (this.commands.glxinfo) {
            let result = this._shell_exec(this.commands.glxinfo);

            if (this._regex_match('OpenGL vendor string:.*Intel', result))
                return 'intel';
            if (this._regex_match('OpenGL vendor string:.*NVIDIA', result))
                return 'nvidia';
        }

        return 'unknown';
    },

    /**
     * Property query getter:
     * shell command `prime-select query` result
     *
     * @return {String}
     */
    get query() {
        if (this.commands.prime) {
            let result = this._shell_exec(this.commands.prime + ' query');

            if (result)
                return result.trim();
        }

        return 'unknown';
    },

    /**
     * GPU switch
     *
     * @param  {String}  gpu    intel|nvidia
     * @param  {Boolean} logout (optional)
     * @return {Void}
     */
    switch: function(gpu, logout) {
        if (!this.commands.sudo || !this.commands.prime)
            return;
        if (this.query === gpu)
            return;

        let command = this.commands.sudo
             + ' ' + this.commands.bash
             + ' ' + this.commands.switch
             + ' ' + gpu
             + (logout ? ' --logout' : '');

        this._log('switching to ' + gpu);
        this._shell_exec_async(command);
    },

    /**
     * Start nvidia-settings
     *
     * @return {Void}
     */
    settings: function() {
        if (!this.commands.settings)
            return;

        this._shell_exec_async(this.commands.settings);
    },

    /**
     * Start file monitoring
     *
     * @return {Void}
     */
    monitor: function() {
        if (this.listener)
            return;

        this.listener = Gio.File.new_for_path(INDEX).monitor_file(Gio.FileMonitorFlags.NONE, null);
        this.listener.connect('changed', Lang.bind(this, this._handle_listener));
    },

    /**
     * Stop file monitoring
     *
     * @return {Void}
     */
    unmonitor: function() {
        if (!this.listener)
            return;

        this.listener.cancel();
        this.listener = null;
    },

    /**
     * File monitor change event handler
     *
     * @param  {Object} file
     * @param  {Object} otherFile
     * @param  {Object} eventType
     * @return {Void}
     */
    _handle_listener: function(file, otherFile, eventType) {
        this.emit('gpu-change', this.gpu);
    },

    /* --- */

});

Signals.addSignalMethods(Switch.prototype);
