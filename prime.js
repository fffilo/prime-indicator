/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const Lang = imports.lang;
const Gio = imports.gi.Gio;
const Signals = imports.signals;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Log = Me.imports.log;

/**
 * Switch constructor:
 * prime profiles manipulation
 *
 * @param  {Object}
 * @return {Object}
 */
var Switch = new Lang.Class({

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
        this._commands = null;
        this._gpu = null;
        this._listener = null;

        this._commands = {
            sudo: this._which('pkexec') || this._which('gksudo'),
            select: this._which('prime-select'),
            management: this._which('nvidia-smi'),
            settings: this._which('nvidia-settings'),
        }
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
        let args = Array.prototype.slice.call(arguments);
        args.unshift('Prime.Switch');

        Log.journal.apply(Log.journal, args);
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
     * Property gpu getter:
     * if `nvidia-smi -q` shell command exit code
     * is non-zero, 'nvidia' is not in use
     *
     * @return {String}
     */
    get gpu() {
        if (this._gpu)
            return this._gpu;

        let cmd = this.command('management');
        if (cmd) {
            let exec = this._shell_exec(cmd + ' -L');
            this._gpu = exec.status ? 'intel' : 'nvidia';
        }
        else
            this._gpu = 'unknown';

        return this.gpu;
    },

    /**
     * Property query getter:
     * shell command `prime-select query` result
     *
     * @return {String}
     */
    get query() {
        let cmd = this.command('select');
        if (cmd) {
            let exec = this._shell_exec(cmd + ' query');
            return exec.stdout.trim() || exec.stderr.trim() || 'unknown';
        }

        return 'unknown';
    },

    /**
     * Get shell command
     *
     * @param  {String} cmd sudo|select|management|settings
     * @return {String}     null on fail
     */
    command: function(cmd) {
        if (cmd in this._commands)
            return this._commands[cmd];

        return null;
    },

    /**
     * GPU switch
     * shell command `prime-select $gpu`, where
     * gpu is 'intel' or 'nvidia'
     *
     * @param  {String}   gpu    intel|nvidia
     * @param  {Function} logout (optional)
     * @return {Void}
     */
    switch: function(gpu, callback) {
        let sudo = this.command('sudo');
        if (!sudo)
            return;

        let select = this.command('select');
        if (!select)
            return;

        if (this.query === gpu)
            return;

        let cmd = sudo
             + ' ' + select
             + ' ' + gpu

        this._log('switching to ' + gpu);
        this._shell_exec_async(cmd, Lang.bind(this, function(e) {
            if (!e.status)
                this._log('switched to ' + gpu);
            else
                this._log('not switched to ' + gpu + ' (' + e.stderr.trim() + ')');

            if (typeof callback === 'function')
                callback.call(this, {
                    gpu: gpu,
                    result: !e.status,
                });
        }));
    },

    /**
     * Start nvidia-settings
     *
     * @return {Void}
     */
    settings: function() {
        let cmd = this.command('settings');
        if (!cmd)
            return;

        this._shell_exec_async(cmd);
    },

    /**
     * Start file monitoring
     *
     * @return {Void}
     */
    monitor: function() {
        if (this._listener)
            return;

        this._listener = Gio.File.new_for_path(this.INDEX).monitor_file(Gio.FileMonitorFlags.NONE, null);
        this._listener.connect('changed', Lang.bind(this, this._handle_listener));
    },

    /**
     * Stop file monitoring
     *
     * @return {Void}
     */
    unmonitor: function() {
        if (!this._listener)
            return;

        this._listener.cancel();
        this._listener = null;
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
