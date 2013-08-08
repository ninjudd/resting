define(["underscore", "jquery"], function(_, $) {

  var Resting = function (subclass, opts) {
    if (this instanceof Resting) return;
    _.extend(subclass.prototype, new Resting(), opts);
    _.extend(subclass, Resting, opts);
  };

  Resting.http = function(method, data, id) {
    return $.ajax({
      url: id ? this.baseUrl + '/' + encodeURIComponent(id) : this.baseUrl,
      dataType: 'json',
      contentType: 'application/json',
      data: JSON.stringify(data),
      type: method.toUpperCase()
    }).then(null, function(results) {
      return results.responseText ? JSON.parse(results.responseText) : {};
    });
  };

  Resting.prototype.http = function(method, data) {
    return this.constructor.http(method, data, this.id);
  };

  Resting.prototype.save = function(opts) {
    opts = opts || {};
    if (this.id) {
      var self = this;
      var data = _.extend({}, this.attrs);
      if (opts.force) data.force = true;
      return this.http('put', data).done(function(results) {
        self.attrs.hash = results.hash;
      });
    }
  };

  Resting.prototype.draw = function() {
    // override for Resting.Document
  };

  Resting.prototype.clear = function() {
    // override for Resting.Document
  };

  Resting.prototype.rename = function(id) {
    var self = this;
    return this.http('patch', {id: id}).done(function() {
      self.id = id;
    });
  };

  Resting.prototype.destroy = function(opts) {
    var self = this;
    return this.http('delete', opts);
  };

  Resting.prototype.overrideAttrs = function(overrides) {
    this.attrs = _.extend(this.attrs, overrides);
  };

  Resting.load = function(id, overrides) {
    var subclass = this;
    if (id) {
      return this.http('get', null, id).then(function (results) {
        if (results) {
          var instance = new subclass();
          instance.id  = id;
          instance.attrs = results;
          instance.overrideAttrs(overrides);
          _.bindAll(instance);
          return instance;
        }
      });
    } else {
      return jQuery.Deferred(function (promise) {
        promise.resolve(new subclass());
      });
    }
  };

  Resting.list = function() {
    return this.http('get');
  };

  return Resting;
});
