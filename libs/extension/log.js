/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// Strict mode.
'use strict';

// Import modules.
const {Gio, GLib} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();

/**
 * Proxy for global.log.
 *
 * @param  {String}    widget
 * @param  {...String} message
 * @return {Void}
 */
var journal = (widget, ...message) => {
    let prefix = Me.metadata.uuid;
    prefix += widget ? '.' + widget : '';
    prefix = '[' + prefix + ']';

    let args = [ prefix + (message.length ? ' ' + message.shift() : '') ];
    if (message.length)
        args = args.concat(message);

    global.log.apply(global, args);
};

/**
 * Append log to ~/.{Me.metadata.uuid}.log.
 *
 * @param  {...String} message
 * @return {Void}
 */
var file = (...message) => {
    let dir = GLib.getenv('HOME'),
        path = dir + '/' + Me.metadata.uuid + '.log',
        data = message.join(', ');

    _appendToFile(path, data);
};

/**
 * Append log to /tmp/.{Me.metadata.uuid}.log
 *
 * @param  {...String} message
 * @return {Void}
 */
var tmp = (...message) => {
    let dir = GLib.get_tmp_dir(),
        path = dir + '/' + Me.metadata.uuid + '.log',
        data = message.join(', ');

    _appendToFile(path, data);
};

/**
 * Get current time.
 *
 * @return {String}
 */
const _getCurrentTime = () => {
    let date = new Date(),
        result = date.getFullYear()
            + '-' + ('0' + (date.getMonth() + 1)).substr(-2)
            + '-' + ('0' + date.getDate()).substr(-2)
            + ' ' + ('0' + date.getHours()).substr(-2)
            + ':' + ('0' + date.getMinutes()).substr(-2)
            + ':' + ('0' + date.getSeconds()).substr(-2)
            + '.' + date.getMilliseconds();

    return result;
};

/**
 * Append data to file.
 *
 * @param  {String} path
 * @param  {String} data
 * @return {Void}
 */
const _appendToFile = (path, data) => {
    let file = Gio.File.new_for_path(path),
        stream = file.append_to(Gio.FileCreateFlags.NONE, null),
        append = ''
            + '[' + _getCurrentTime() + ']' + (data ? ' ' : '')
            + data
            + '\n';

    stream.write(append, null);
    stream.close(null);
};
