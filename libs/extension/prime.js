/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// Strict mode.
'use strict';

// Import modules.
const {GLib, Gio} = imports.gi;
const Signals = imports.signals;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Log = Me.imports.libs.extension.log;

/**
 * Switch:
 * prime profiles manipulation.
 */
var Switch = class Switch {
    /**
     * Constructor.
     *
     * @return {Void}
     */
    constructor() {
        this._commands = null;
        this._gpu = null;
        this._listener = null;

        this._commands = {
            sudo: this._which('pkexec') || this._which('gksudo'),
            select: this._which('prime-select'),
            management: this._which('nvidia-smi'),
            settings: this._which('nvidia-settings'),
        }

        // Make getter store default query (if not already done so).
        this.defaultQuery;
    }

    /**
     * Destructor.
     *
     * @return {Void}
     */
    destroy() {
        this.unmonitor();

        delete this._listener;
        delete this._gpu;
        delete this._commands;
    }

    /**
     * Proxy for global.log().
     *
     * @param  {...String} message
     * @return {Void}
     */
    _log(...message) {
        Log.journal('Prime.Switch', message);
    }

    /**
     * `which $command` result.
     *
     * @param  {String} command
     * @return {Mixed}
     */
    _which(command) {
        let exec = this._shellExec('which ' + command);
        return exec.stdout.trim() || exec.stderr.trim();
    }

    /**
     * Shell execute command.
     *
     * @param  {String} command
     * @return {Object}
     */
    _shellExec(command) {
        let result = {
            status: -1,
            stdin: command,
            stdout: '',
            stderr: '',
        };

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
    }

    /**
     * Shell execute command.
     *
     * @param  {String}   command
     * @param  {Function} callback (optional)
     * @return {Void}
     */
    _shellExecAsync(command, callback) {
        try {
            let subprocess = new Gio.Subprocess({
                argv: command.split(' '),
                flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
            });

            subprocess.init(null);
            subprocess.communicate_utf8_async(null, null, (source, resource) => {
                let status = source.get_exit_status(),
                    [, stdout, stderr] = source.communicate_utf8_finish(resource);

                if (typeof callback === 'function')
                    callback.call(this, {
                        status: status,
                        stdin: command,
                        stdout: stdout,
                        stderr: stderr,
                    });
            });
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
    }

    /**
     * File with prime status.
     *
     * @type {String}
     */
    get index() {
        return '/etc/prime-discrete';
    }

    /**
     * Property gpu getter:
     * if `nvidia-smi -q` shell command exit code is non-zero, 'nvidia' is not
     * in use.
     *
     * @return {String}
     */
    get gpu() {
        if (this._gpu)
            return this._gpu;

        let cmd = this.command('management');
        if (cmd) {
            let exec = this._shellExec(cmd + ' -L');
            this._gpu = exec.status ? 'intel' : 'nvidia';
        }
        else
            this._gpu = 'unknown';

        return this.gpu;
    }

    /**
     * Property query getter:
     * shell command `prime-select query` result.
     *
     * @return {String}
     */
    get query() {
        let cmd = this.command('select');
        if (cmd) {
            let exec = this._shellExec(cmd + ' query');
            return exec.stdout.trim() || exec.stderr.trim() || 'unknown';
        }

        return 'unknown';
    }

    /**
     * Property default query getter:
     * query on system init.
     *
     * @return {String}
     */
    get defaultQuery() {
        let result = GLib.getenv('PRIME_INDICATOR_DEFAULT_QUERY');
        if (result)
            return result;

        result = this.query;
        GLib.setenv('PRIME_INDICATOR_DEFAULT_QUERY', result, true);
        this._log('detected ' + result + ' as default prime option');

        return this.defaultQuery;
    }

    /**
     * Get switches (valid arguments for switch command).
     *
     * @return {Array}
     */
    get switches() {
        if (this._switches)
            return this._switches.slice();

        let command = this.command('select');
        if (command) {
            let exec = this._shellExec(command),
                output = exec.stdout || exec.stderr,
                args = output.trim().split(' ').pop().split('|');
            if (args.length)
                this._switches = args.filter(item => item !== 'query');
            else
                this._switches = [ 'nvidia', 'intel' ];
        }
        else {
            this._switches = [];
        }

        return this.switches;
    }

    /**
     * Does sysem need restarting:
     * we store query value on initialization, and if this value differs from
     * current one means that we need restart.

     * Warning:
     * This may not be 100% accurate. User can switch gpu (without restart)
     * and then install extension. In this case defaultQuery variable will be
     * invalid.
     *
     * @return {Boolean}
     */
    get isRestartNeeded() {
        return this.query !== this.defaultQuery && this.command('select');
    }

    /**
     * Get shell command.
     *
     * @param  {String} cmd sudo|select|management|settings
     * @return {String}     null on fail
     */
    command(cmd) {
        if (cmd in this._commands)
            return this._commands[cmd];

        return null;
    }

    /**
     * GPU switch:
     * shell command `prime-select $gpu`, where gpu is 'intel' or 'nvidia'.
     *
     * @param  {String}   gpu    intel|nvidia
     * @param  {Function} logout (optional)
     * @return {Void}
     */
    switch(gpu, callback) {
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
            + ' ' + gpu;

        this._log('switching to ' + gpu);
        this._shellExecAsync(cmd, (e) => {
            if (!e.status)
                this._log('switched to ' + gpu);
            else
                this._log('not switched to ' + gpu + ' (' + e.stderr.trim() + ')');

            if (!e.status && this.isRestartNeeded)
                this._log('system restart required');

            if (typeof callback === 'function')
                callback.call(this, {
                    gpu: gpu,
                    result: !e.status,
                });
        });
    }

    /**
     * Start nvidia-settings.
     *
     * @return {Void}
     */
    settings() {
        let cmd = this.command('settings');
        if (!cmd)
            return;

        this._shellExecAsync(cmd);
    }

    /**
     * Start file monitoring.
     *
     * @return {Void}
     */
    monitor() {
        if (this._listener)
            return;

        this._listener = Gio.File.new_for_path(this.index).monitor_file(Gio.FileMonitorFlags.NONE, null);
        this._listener.connect('changed', this._handleListener.bind(this));
    }

    /**
     * Stop file monitoring.
     *
     * @return {Void}
     */
    unmonitor() {
        if (!this._listener)
            return;

        this._listener.cancel();
        this._listener = null;
    }

    /**
     * File monitor change event handler.
     *
     * @param  {Object} file
     * @param  {Object} otherFile
     * @param  {Object} eventType
     * @return {Void}
     */
    _handleListener(file, otherFile, eventType) {
        this.emit('gpu-change', this.query);
    }

    /* --- */
};

Signals.addSignalMethods(Switch.prototype);
