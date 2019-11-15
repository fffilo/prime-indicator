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
 * Switch constructor:
 * prime profiles manipulation
 *
 * @param  {Object}
 * @return {Object}
 */
const Switch = new Lang.Class({

    Name: 'PrimeIndicator.Prime.Switch',

    /**
     * File with prime status
     *
     * @type {String}
     */
    INDEX: '/etc/prime-discrete',

    /**
     * Constructor
     *
     * @return {Void}
     */
    _init: function() {
        this.commands = {
            sudo: this._which('pkexec') || this._which('gksudo'),
            gpu: this._which('gpu'),
            prime: this._which('prime-select'),
            settings: this._which('nvidia-settings'),
        }

        this.listener = null;
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
        let exec = this._shell_exec('which ' + command);
        return exec.stdout.trim() || exec.stderr.trim();
    },

    /**
     * Shell execute command
     *
     * @param  {String} command
     * @return {Object}
     */
    _shell_exec: function(command) {
        let result = {
            status: -1,
            stdin: command,
            stdout: '',
            stderr: '',
        }

        try {
            let subprocess = new Gio.Subprocess({
                argv: command.split(' '),
                flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
            });
            subprocess.init(null);

            let [, stdout, stderr] = subprocess.communicate_utf8(null, null);
            result.status = subprocess.get_exit_status();;
            result.stdout = stdout;
            result.stderr = stderr;
        }
        catch(e) {
            result.stderr = e.toString();
        }

        return result;
    },

    /**
     * Shell execute command
     *
     * @param  {String}   command
     * @param  {Function} callback (optional)
     * @return {Void}
     */
    _shell_exec_async: function(command, callback) {
        try {
            let subprocess = new Gio.Subprocess({
                argv: command.split(' '),
                flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
            });

            subprocess.init(null);
            subprocess.communicate_utf8_async(null, null, Lang.bind(this, this._handle_async_shell_exec, command, callback));
        }
        catch(e) {
            if (typeof callback === 'function')
                callback.call(this, {
                    status: -1,
                    stdin: command,
                    stdout: '',
                    stderr: e.toString(),
                });
        }
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
        if (this.commands.gpu) {
            let exec = this._shell_exec(this.commands.gpu);
            let output = exec.stdout.trim() || exec.stderr.trim();

            if (this._regex_match('OpenGL vendor string:.*Intel', output))
                return 'intel';
            if (this._regex_match('OpenGL vendor string:.*NVIDIA', output))
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
            let exec = this._shell_exec(this.commands.prime + ' query');
            return exec.stdout.trim() || exec.stderr.trim() || 'unknown';
        }

        return 'unknown';
    },

    /**
     * GPU switch
     *
     * @param  {String}   gpu    intel|nvidia
     * @param  {Function} logout (optional)
     * @return {Void}
     */
    switch: function(gpu, callback) {
        if (this.query === gpu)
            return;

        let command = this.commands.sudo
             + ' ' + this.commands.prime
             + ' ' + gpu

        this._log('switching to ' + gpu);
        this._shell_exec_async(command, callback);
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

        this.listener = Gio.File.new_for_path(this.INDEX).monitor_file(Gio.FileMonitorFlags.NONE, null);
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

    /**
     * Async shell exec event handler
     *
     * @param  {Gio.Subprocess} source
     * @param  {Gio.Task}       resource
     * @param  {String}         stdin
     * @param  {Function}       callback (optional)
     * @return {Void}
     */
    _handle_async_shell_exec: function(source, resource, stdin, callback) {
        let status = source.get_exit_status();
        let [, stdout, stderr] = source.communicate_utf8_finish(resource);

        if (typeof callback === 'function')
            callback.call(this, {
                status: status,
                stdin: stdin,
                stdout: stdout,
                stderr: stderr,
            });
    },

    /* --- */

});

Signals.addSignalMethods(Switch.prototype);
