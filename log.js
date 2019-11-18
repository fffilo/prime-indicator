/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
'use strict';

// import modules
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/**
 * Proxy for global.log
 *
 * note: method can have additional
 * arguments
 *
 * @param  {String} widget
 * @param  {String} message
 * @return {Void}
 */
var journal = function(widget, message) {
    let prefix = Me.metadata.uuid;
    prefix += widget ? '.' + widget : '';
    prefix = '[' + prefix + ']';

    let args = [prefix + (message ? ': ' + message : '')];
    args.push.apply(args, Array.prototype.slice.call(arguments, 2));

    global.log.apply(global, args);
}

/**
 * Append log to ~/.{Me.metadata.uuid}.log
 *
 * note: method can have additional
 * arguments
 *
 * @param  {String} message
 * @return {Void}
 */
var file = function(message) {
    let dir = GLib.getenv('HOME');
    let path = dir + '/' + Me.metadata.uuid + '.log';
    let data = Array.prototype.slice.call(arguments).join(', ');

    appendToFile(path, data);
}

/**
 * Append log to /tmp/.{Me.metadata.uuid}.log
 *
 * note: method can have additional
 * arguments
 *
 * @param  {String} message
 * @return {Void}
 */
var tmp = function(message) {
    let dir = GLib.get_tmp_dir();
    let path = dir + '/' + Me.metadata.uuid + '.log';
    let data = Array.prototype.slice.call(arguments).join(', ');

    appendToFile(path, data);
}

/**
 * Get current time
 *
 * @return {String}
 */
const time = function() {
    let date = new Date();
    let result = date.getFullYear()
        + '-' + ('0' + (date.getMonth() + 1)).substr(-2)
        + '-' + ('0' + date.getDate()).substr(-2)
        + ' ' + ('0' + date.getHours()).substr(-2)
        + ':' + ('0' + date.getMinutes()).substr(-2)
        + ':' + ('0' + date.getSeconds()).substr(-2)
        + '.' + date.getMilliseconds();

    return result;
}

/**
 * Append data to file
 *
 * @param  {String} path
 * @param  {String} data
 * @return {Void}
 */
const appendToFile = function(path, data) {
    let file = Gio.File.new_for_path(path);
    let stream = file.append_to(Gio.FileCreateFlags.NONE, null);
    let append = ''
        + '[' + time() + ']' + (data ? ' ' : '')
        + data
        + '\n';

    stream.write(append, null);
    stream.close(null);
}
