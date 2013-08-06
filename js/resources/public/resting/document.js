define([
  "text!resting/document.html", "underscore_contrib", "jquery_ui", "bootstrap", "chosen"
], function(html, _, $) {

  var Document = function(opts) {
    this.type     = opts.type;
    this.selector = opts.selector;
    this.name     = opts.name;
    this.icon     = opts.icon;
    this.drawContainer();
  };

  Document.prototype.scrubName = function(name) {
    return name;
  };

  Document.prototype.container = function() {
    return $(this.selector);
  };

  Document.prototype.drawContainer = function() {
    this.container().html(this.template({name: this.name, icon: this.icon}));
    this.registerEvents();
  };

  Document.prototype.addToolbarButton = function(id, icon) {
    var button = $("<span/>", {id: id}).append($("<img/>", {class: "resting-icon faded", src: icon}));
    this.$("#toolbar").append(button);
  };

  Document.prototype.registerClick = function(functionName, selector) {
    selector = selector || "#" + functionName;
    var self = this;
    this.$(selector).click(function () {
      self[functionName].call(self);
      return false;
    });
  };

  Document.prototype.registerEvents = function() {
    var self = this;

    this.registerClick("draw", "#refresh");
    this.registerClick("showLoadForm", "#load");
    this.registerClick("submitLoadForm", "#load-submit");
    _.each(["save", "rename", "duplicate", "revert", "close", "destroy"], function(action) {
      self.registerClick(action);
    });

    this.$("#load-name").chosen();

    this.$("#name").blur(function() {
      self.changeName();
    });

    this.blurOnEnter("#name");
  };

  Document.prototype.registerKeyboardShortcuts = function() {
    var self = this;

    $(document).bind('keydown', function(e) {
      if (e.metaKey || e.ctrlKey) {
        if (e.keyCode == 83) { // Ctrl-s or Command-s
          self.save();
          return false;
        } else if (e.keyCode == 79) { // Ctrl-o or Command-o
          self.showLoadForm();
          return false;
        }
      }
    });
  };

  Document.prototype.rename = function() {
    this.renaming = true;
    this.$("#menu").dropdown("toggle");
    this.$("#name").attr({contenteditable: true}).focus();
    this.selectAll();
    return false;
  };

  Document.prototype.duplicate = function() {
    var name = this.scrubName(this.model.id + " copy");
    this.$("#name").attr({contenteditable: true}).text(name).focus();
    this.$("#menu").dropdown("toggle");
    this.markChanged(true);
    this.selectAll();
    return false;
  };

  Document.prototype.changeName = function() {
    var self  = this;
    var $name = this.$("#name");
    var name  = this.scrubName($name.text());
    $name.text(name);

    if (this.renaming && this.model.attrs.hash) {  // rename
      var from = self.model.id;
      this.model.rename(name).done(function() {
        self.showAlert("Renamed " + from + " to " + name, "success");
        if (self.afterRename) self.afterRename();
      }).fail(function(response) {
        self.showAlert(response.error);
        $name.text(self.model.id);
      });
      this.renaming = false;
    } else {  // duplicate
      this.model.id = name;
      if (this.afterDuplicate) this.afterDuplicate();
      this.model.attrs.hash = null;
    }
    $name.attr({contenteditable: false});
  };

  Document.prototype.revert = function() {
    this.$("#menu").dropdown("toggle");
    if (this.confirmRevert()) {
      this.load(this.model.id);
    }
    return false;
  };

  Document.prototype.close = function() {
    this.$("#menu").dropdown("toggle");
    if (this.confirmRevert()) {
      this.load("");
    }
    return false;
  };

  Document.prototype.destroy = function() {
    var self = this;

    this.$("#menu").dropdown("toggle");
    if (confirm(this.model.id + " will be permanently deleted. Are you sure?")) {
      this.model.destroy().done(function() {
        self.showAlert("Deleted " + doc.id, "success");
        self.load("");
      }).fail(function(response) {
        self.showAlert(response.error, "error");
      });
    }
    return false;
  };

  Document.prototype.selectAll = function() {
    document.execCommand("selectAll", false, null);
  };

  Document.prototype.$ = function(selector) {
    return this.container().find(".resting-document").find(selector);
  };

  Document.prototype.draw = function(unchanged) {
    if (this.model) {
      var self = this;
      var body = this.$("#body")[0];
      return this.model.draw(body).done(function() {
        self.displayHeader();
        // Use draw count as a proxy for changes since we only redraw when a change is made.
        if (!unchanged) self.draws++;
        self.markChanged(self.draws > 1);
        if (self.afterDraw) self.afterDraw();
      }).fail(function(error) {
        self.showAlert(error, "error");
      });
    }
  };

  Document.prototype.template = _.template(html);

  Document.prototype.load = function(id) {
    var self = this;

    this.draws = 0;
    if (this.model) this.model.clearRefresh();

    this.type.load(id).then(function(m) {
      if (m) {
        self.model = m;
        self.afterLoad();
      } else {
        self.showAlert("cannot find " + id);
        if (!self.model) self.load("");
      }
    });
  };

  Document.prototype.showLoadForm = function() {
    var $loadName = this.$("#load-name");
        self      = this
    this.$("#load-form").modal('toggle').on('shown', function() {
      self.type.list().done(function(names) {
        $loadName.empty();
        names = names || [];
        $.each(names.sort(), function(k, v) {
          $loadName.append($("<option>", {value: v}).text(v));
        });
        $loadName.trigger("liszt:updated");
        $('#load-form .chzn-drop .chzn-search input[type="text"]').focus();
      });
    });
  };

  Document.prototype.submitLoadForm = function() {
    var name = this.$("#load-name option:selected").text();
    this.load(name);
    this.$("#load-form").modal("toggle");
  };

  Document.prototype.afterLoad = function() {
    this.draw();
  };

  Document.prototype.save = function(opts) {
    var self = this;
    this.model.id = this.model.id || prompt("Save as:");

    this.model.save(opts).done(function(results) {
      self.showAlert(self.model.id + " saved", "success");
      self.afterSave();
      self.markChanged(false);
      self.displayHeader();
    }).fail(function(response) {
      if (response.error) {
        if (confirm(response.error + " Would you like to overwrite?")) {
          self.save({force: true});
        }
      } else {
        self.showAlert("save failed", "error");
      }
    });
  };

  Document.prototype.afterSave = function() {
    // do nothing by default
  };

  Document.prototype.showAlert = function(text, type) {
    if (type) type = "alert-" + type;
    $("#alerts").append($("<div/>", {class: "alert fade in " + type, text: text}));
    setTimeout(function() { $(".alert").alert('close'); }, 3000);
  };

  Document.prototype.markChanged = function(changed) {
    this.isChanged = changed;
    this.display("#edited", changed);
    this.flipClass($("#revert, #save").parent(), !changed, "disabled");
  };

  Document.prototype.confirmRevert = function() {
    return !this.isChanged || confirm("All unsaved changes to " + this.model.id + " will be lost. Are you sure?");
  };

  Document.prototype.displayHeader = function() {
    $("#name").text(this.model.id || "untitled");
    this.flipClass($("#rename").parent(), !this.model.id, "disabled");
    this.$("#header").toggle(!!this.model.id || !this.model.isEmpty());
  };

  _.each(["blurOnEnter", "flipClass", "display"], function(name) {
    Document.prototype[name] = function(selector) {
      var args = _.cons(this.$(selector), _.rest(arguments));
      Document[name].apply(Document, args);
    };
  });

  Document.blurOnEnter = function(selector) {
    $(selector).keydown(function(e) {
      if (e.keyCode == 13) $(this).blur();
    });
  };

  Document.flipClass = function(selector, state, classString) {
    var element = $(selector);
    state ? element.addClass(classString) : element.removeClass(classString);
  };

  Document.display = function(selector, show) {
    $(selector).css({display: show ? "inline-block" : "none"})
  };

  return Document;
});
