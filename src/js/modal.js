//create lobibox object
var Lobibox = Lobibox || {};
(function(){
    
//------------------------------------------------------------------------------
//------------------------------------------------------------------------------

    //User can set default properties for prompt in the following way
    //Lobibox.prompt.DEFAULT_OPTIONS = object;
    Lobibox.prompt = function (type, options) {
        return new LobiboxPrompt(type, options);
    };
    //User can set default properties for confirm in the following way
    //Lobibox.confirm.DEFAULT_OPTIONS = object;
    Lobibox.confirm = function (options) {
        return new LobiboxConfirm(options);
    };
    //User can set default properties for progress in the following way
    //Lobibox.progress.DEFAULT_OPTIONS = object;
    Lobibox.progress = function (options) {
        return new LobiboxProgress(options);
    };
    //Create empty objects in order user to be able to set default options in the following way
    //Lobibox.error.DEFAULT_OPTIONS = object;
    //Lobibox.success.DEFAULT_OPTIONS = object;
    //Lobibox.warning.DEFAULT_OPTIONS = object;
    //Lobibox.info.DEFAULT_OPTIONS = object;

    Lobibox.error = {};
    Lobibox.success = {};
    Lobibox.warning = {};
    Lobibox.info = {};

    //User can set default properties for alert in the following way
    //Lobibox.alert.DEFAULT_OPTIONS = object;
    Lobibox.alert = function (type, options) {
        if (["success", "error", "warning", "info"].indexOf(type) > -1) {
            return new LobiboxAlert(type, options);
        }
    };
    //User can set default properties for window in the following way
    //Lobibox.window.DEFAULT_OPTIONS = object;
    Lobibox.window = function (options) {
        return new LobiboxWindow('window', options);
    };

    
    /**
     * Base prototype for all messageboxes and window
     */
    var LobiboxBase = {
        $type       : null,
        $el         : null,
        $options    : null,
        debug       : function(){
            if (this.$options.debug){
                window.console.debug.apply(window.console, arguments);
            }
        },
        _processInput: function(options){
            var me = this;
            if ( ! options.title){
                options.title = Lobibox.locales.titles[me.$type];
            }
            if ($.isArray(options.buttons)){
                var btns = {};
                for (var i=0; i<options.buttons.length; i++){
                    var btn = BASE_OPTIONS.buttons[options.buttons[i]];
                    
                    btns[options.buttons[i]] = btn;
                }
                options.buttons = btns;
            }
            options.customBtnClass = options.customBtnClass ? options.customBtnClass : LobiboxBase.DEFAULT_OPTIONS.customBtnClass;
            for (var i in options.buttons){
                var btn = options.buttons[i];
                if (options.buttons.hasOwnProperty(i)){
                    if (BASE_OPTIONS.buttons[i]){
                        btn = $.extend({}, BASE_OPTIONS.buttons[i], btn);
                        options.buttons[i] = btn;
                    }else{
                        btn['class'] = options.customBtnClass;
                    }
                }
                 
            }
            options = $.extend({}, LobiboxBase.DEFAULT_OPTIONS, options);
            if (options.animationClass === undefined) {
                options.animationClass = BASE_OPTIONS.animationClass;
            }
            return options;
        },
        _init: function(){
            var me = this;
            
            me._triggerEvent('beforeCreate');
            
            me._createMarkup();
            me.setTitle(me.$options.title);
            if (me.$options.draggable && ! me._isMobileScreen()){
                me.$el.addClass('draggable');
                me._enableDrag();
            }
            if (me.$options.closeButton){
                me._addCloseButton();
            }
            if (me.$options.closeOnEsc){
                $(document).on('keyup.lobibox', function(ev){
                    if (ev.which === 27){
                        me.destroy();
                    }
                });
            }
            
            if (me.$options.animationClass){
                me.$el.addClass(me.$options.animationClass);
            }
            me.$el.data('lobiboxMessage', me);
        },
        /**
         * 
         * 
         * @param {String} position "'top', 'center', 'bottom'"
         * @returns {Object}
         */
        _calculatePosition: function(position){
            var me = this;
            var top;
            if (position === 'top'){
                top = 30;
            }else if (position === 'bottom'){
                top = $(window).outerHeight() - me.$el.outerHeight() - 30;
            }else{
                top = ($(window).outerHeight() - me.$el.outerHeight())/2;
            }
            var left = ($(window).outerWidth() - me.$el.outerWidth())/2;
            return {
                left: left,
                top: top
            };
        },
        _createButton: function(type, op){
            var me = this;
            var btn = $('<button></button>')
                    .addClass('lobibox-btn')
                    .addClass(op['class'])
                    .attr('data-type', type)
                    .html(op.text);
            if (me.$options.callback && typeof me.$options.callback === 'function') {
                btn.on('click.lobibox', function(ev){
                    var bt = $(this);
                    if (BASE_OPTIONS.buttons[type] && BASE_OPTIONS.buttons[type].closeOnClick){
                        me.destroy();
                    }
                    me.$options.callback(me, bt.data('type'), ev);
                });
            }
            btn.click(function() {
                if (BASE_OPTIONS.buttons[type] && BASE_OPTIONS.buttons[type].closeOnClick){
                    me.destroy();
                }
            });
            return btn;
        },
        _generateButtons: function(){
            var me = this;
            var btns = [];
            for (var i in me.$options.buttons){
                if (me.$options.buttons.hasOwnProperty(i)){
                    var op = me.$options.buttons[i];
                    var btn = me._createButton(i, op);
                    btns.push(btn);
                }
            }
            return btns;
        },
        _createMarkup: function(){
            var me = this;
            var lobibox = $('<div class="lobibox"></div>');
            lobibox.attr('data-is-modal', me.$options.modal);
            var header = $('<div class="lobibox-header"></div>')
                    .append('<span class="lobibox-title"></span>')
                    ;
            var body = $('<div class="lobibox-body"></div>');
            lobibox.append(header);
            lobibox.append(body);
            if (me.$options.buttons && ! $.isEmptyObject(me.$options.buttons)){
                var footer = $('<div class="lobibox-footer"></div>');
                footer.append(me._generateButtons());
                lobibox.append(footer);
                if (BASE_OPTIONS.buttonsAlign.indexOf(me.$options.buttonsAlign) > -1){
                    footer.addClass('text-'+me.$options.buttonsAlign);
                }
            }
            me.$el = lobibox
                    .addClass(BASE_OPTIONS.modalClasses[me.$type])
                    ;
        },
        _setSize: function(){
            var me = this;
            me.setWidth(me.$options.width);
            if (me.$options.height === 'auto'){
                me.setHeight(me.$el.outerHeight());
            }else{
                me.setHeight(me.$options.height);
            }
        },
        _calculateBodyHeight: function(height){
            var me = this;
            var headerHeight = me.$el.find('.lobibox-header').outerHeight();
            var footerHeight = me.$el.find('.lobibox-footer').outerHeight();
            return height - (headerHeight ? headerHeight : 0) - (footerHeight ? footerHeight : 0);
            
        },
        /**
         * Add backdrop in case if backdrop does not exist
         * 
         * @returns {void}
         */
        _addBackdrop: function(){
            if ($('.lobibox-backdrop').length === 0){
                $('body').append('<div class="lobibox-backdrop"></div>');
            }
        },
        _triggerEvent: function(type){
            var me = this;
            if (me.$options[type] && typeof me.$options[type] === 'function'){
                me.$options[type](me);
            }
        },
        _calculateWidth: function(width){
            width = Math.min($(window).outerWidth(), width);
            if (width === $(window).outerWidth()){
                width -= 2 * BASE_OPTIONS.horizontalOffset;
            }
            return width;
        },
        _calculateHeight: function(height){
            return Math.min($(window).outerHeight(), height);
        },
        _addCloseButton: function () {
            var me = this;
            var closeBtn = $('<span class="btn-close">&times;</span>');
            me.$el.find('.lobibox-header').append(closeBtn);
            closeBtn.on('click.lobibox', function (ev) {
                me.destroy();
            });
        },
        _position: function () {
            var me = this;

            me._setSize();
            var pos = me._calculatePosition();
            me.setPosition(pos.left, pos.top);
        },
        _isMobileScreen: function () {
            if ($(window).outerWidth() < 768) {
                return true;
            }
            return false;
        },
        _enableDrag: function () {
            var el = this.$el;
            var heading = el.find('.lobibox-header');
            heading.on('mousedown.lobibox', function (ev) {
                var offset = el.offset();
                el.attr('offset-left', ev.clientX - offset.left);
                el.attr('offset-top', ev.clientY - offset.top);
                el.attr('allow-drag', 'true');
            });
            heading.on('mouseup.lobibox', function (ev) {
                el.attr('allow-drag', 'false');
            });
            $(document).on('mousemove.lobibox', function (ev) {
                if (el.attr('allow-drag') === 'true') {
                    var left = ev.clientX - parseInt(el.attr('offset-left'), 10);
                    var top = ev.clientY - parseInt(el.attr('offset-top'), 10);
                    el.css({
                        left: left,
                        top: top
                    });
                    el.css({
                        right: $(document).outerWidth() - (left + el.outerWidth() + 2),
                        bottom: $(document).outerHeight() - (top + el.outerHeight() + 2)
                    });
                }
            });
        },
        /**
         * Set the message of messagebox
         * 
         * @param {String} msg "new message of messagebox"
         * @returns {Instance}
         */
        _setContent: function (msg) {
            var me = this;
            me.$el.find('.lobibox-body').html(msg);
            return me;
        },
//------------------------------------------------------------------------------
//--------------------------PUBLIC METHODS--------------------------------------
//------------------------------------------------------------------------------
        /**
         * Hide the messagebox
         * 
         * @returns {Instance}
         */
        hide: function () {
            this.$el.addClass('lobibox-hidden');
            if ($('.lobibox[data-is-modal=true]:not(.lobibox-hidden)').length === 0) {
                $('.lobibox-backdrop').remove();
                $('body').removeClass(BASE_OPTIONS.bodyClass);
            }
            return this;
        },
        /**
         * Removes the messagebox from document
         * 
         * @returns {Instance}
         */
        destroy: function () {
            this.$el.remove();
            if ($('.lobibox[data-is-modal=true]').length === 0) {
                $('.lobibox-backdrop').remove();
                $('body').removeClass(BASE_OPTIONS.bodyClass);
            }
            return this;
        },
        /**
         * Set the width of messagebox
         * 
         * @param {Integer} width "new width of messagebox"
         * @returns {Instance}
         */
        setWidth: function (width) {
            width = this._calculateWidth(width);
            this.$el.css('width', width);
            return this;
        },
        /**
         * Set the height of messagebox
         * 
         * @param {Integer} height "new height of messagebox"
         * @returns {Instance}
         */
        setHeight: function (height) {
            var me = this;
            height = me._calculateHeight(height);
            me.$el.css('height', height);
            var bHeight = me._calculateBodyHeight(me.$el.innerHeight());
            me.$el.find('.lobibox-body').css('height', bHeight);
            return me;
        },
        /**
         * Set the width and height of messagebox
         * 
         * @param {Integer} width "new width of messagebox"
         * @param {Integer} height "new height of messagebox"
         * @returns {Instance}
         */
        setSize: function (width, height) {
            var me = this;
            me.setWidth(width);
            me.setHeight(height);
            return me;
        },
        /**
         * Set position of messagebox
         * 
         * @param {Integer|String} left "left coordinate of messsagebox or string representaing position. Available: ('top', 'center', 'bottom')"
         * @param {Integer} top
         * @returns {Instance}
         */
        setPosition: function (left, top) {
            var me = this;
            var position;
            if (typeof left === 'number' && typeof top === 'number'){
                position = {
                    left: left,
                    top: top
                };
            }else if (typeof left === 'string'){
                position = me._calculatePosition(left);
            }
            me.$el.css(position);
            return me;
        },
        /**
         * Set the title of messagebox
         * 
         * @param {String} title "new title of messagebox"
         * @returns {Instance}
         */
        setTitle: function (title) {
            var me = this;
            me.$el.find('.lobibox-title').html(title);
            return me;
        },
        /**
         * Get the title of messagebox
         * 
         * @returns {String}
         */
        getTitle: function(){
            var me = this;
            return me.$el.find('.lobibox-title').html();
        },
        /**
         * Show messagebox
         * 
         * @returns {Instance}
         */
        show: function () {
            var me = this;
            me.$el.removeClass('lobibox-hidden');
            me._triggerEvent('beforeShow');
            $('body').append(me.$el).addClass(BASE_OPTIONS.bodyClass);
            if (me.$options.modal) {
                me._addBackdrop();
            }
            me._triggerEvent('onShow');
            return me;
        }
    };
    
    LobiboxBase.OPTIONS = {
        horizontalOffset: 5,
        bodyClass       : 'lobibox-open',
        animationClass : 'animated bounceIn',
        modalClasses : {
            'error'     : 'lobibox-error',
            'success'   : 'lobibox-success',
            'info'      : 'lobibox-info',
            'warning'   : 'lobibox-warning',
            'confirm'   : 'lobibox-confirm',
            'progress'  : 'lobibox-progress',
            'prompt'    : 'lobibox-prompt',
            'default'   : 'lobibox-default',
            'window'    : 'lobibox-window'
        },
        buttonsAlign: ['left', 'center', 'right'],
        buttons: {
            ok: {
                'class': 'lobibox-btn-default',
                text: Lobibox.locales.buttons.ok,
                closeOnClick: true
            },
            cancel: {
                'class': 'lobibox-btn-cancel',
                text: Lobibox.locales.buttons.cancel,
                closeOnClick: true
            },
            yes: {
                'class': 'lobibox-btn-yes',
                text: Lobibox.locales.buttons.yes,
                closeOnClick: true
            },
            no: {
                'class': 'lobibox-btn-no',
                text: Lobibox.locales.buttons.no,
                closeOnClick: true
            }
        }
    };
    //User can set default options by this variable
    Lobibox.base = {};
    Lobibox.base.DEFAULTS = {};
    var BASE_OPTIONS = $.extend({}, LobiboxBase.OPTIONS, Lobibox.base.DEFAULTS);
    LobiboxBase.DEFAULT_OPTIONS = {
        width           : 600,
        height          : 'auto',  // Height is automatically given calculated by width
        closeButton     : true,  // Show close button or not
        draggable       : false,  // Make messagebox draggable 
        customBtnClass  : 'lobibox-btn-default', // Class for custom buttons
        modal           : true,
        debug           : true,
        buttonsAlign    : 'center', // Position where buttons should be aligned
        closeOnEsc      : true,  // Close messagebox on Esc press
        
        //events
        beforeCreate    : null,
        beforeShow      : null,
        onShow          : null,
        beforePosition  : null,
        afterPosition   : null
    };
//------------------------------------------------------------------------------
//-------------------------LobiboxPrompt----------------------------------------
//------------------------------------------------------------------------------
    function LobiboxPrompt (type, options){
        this.$input         = null;
        this.$type          = 'prompt';
        this.$promptType    = type;
        
        options = $.extend({}, Lobibox.prompt.DEFAULT_OPTIONS, options);
        
        this.$options = this._processInput(options);
        
        this._init();
        this.debug(this);
    };
    
    LobiboxPrompt.prototype = $.extend({}, LobiboxBase, {
        constructor: LobiboxPrompt,
        
        _processInput: function(options){
            var me = this;
            
            var mergedOptions = LobiboxBase._processInput.call(me, options);
            mergedOptions.buttons = {
                ok: BASE_OPTIONS.buttons.ok,
                cancel: BASE_OPTIONS.buttons.cancel
            };
            options = $.extend({}, mergedOptions, LobiboxPrompt.DEFAULT_OPTIONS, options);
            return options;
        },
        _init: function(){
            var me = this;
            
            LobiboxBase._init.call(me);
            
            me.show();
            me._setContent(me._createInput());
//            me.$input.focus();
            me._position();
            me.$input.focus();
        },
        _createInput: function(){
            var me = this;
            var label;
            if (me.$options.multiline){
                me.$input = $('<textarea></textarea>');
                me.$input.attr('rows' , me.$options.lines);
            }else{
                me.$input = $('<input type="'+me.$promptType+'"/>');
            }
            me.$input.addClass('lobibox-input');
            me.$input.attr(me.$options.attrs);
            if (me.$options.label){
                label = $('<label>'+me.$options.label+'</label>');
            }
            var innerHTML = $('<div></div>').append(label, me.$input);
            return innerHTML;
        },
        /**
         * Set value of input
         * 
         * @param {Strin} val "value of input"
         * @returns {Instance}
         */
        setValue: function(val){
            this.$input.val(val);
            return this;
        },
        /**
         * Get value of input
         * 
         * @returns {String}
         */
        getValue: function(){
            return this.$input.val();
        }
    });
    
    LobiboxPrompt.DEFAULT_OPTIONS = {
        width: 400,
        attrs : {},         // Object of any valid attribute of input field
        value: '',          // Value which is given to textfield when messagebox is created
        multiline: false,   // Set this true for multiline prompt
        lines: 3,           // This works only for multiline prompt. Number of lines
        type: 'text',       // Prompt type. Available types (text|number|color)
        label: ''           // Set some text which will be shown exactly on top of textfield
    };
//------------------------------------------------------------------------------
//-------------------------LobiboxConfirm---------------------------------------
//------------------------------------------------------------------------------
    function LobiboxConfirm (options){
        this.$type      = 'confirm';
        
        options = $.extend({}, Lobibox.confirm.DEFAULT_OPTIONS, options);
        
        this.$options   = this._processInput(options);
        this._init();
        this.debug(this);
    };
    
    LobiboxConfirm.prototype = $.extend({}, LobiboxBase, {
        constructor: LobiboxConfirm,
        
        _processInput: function(options){
            var me = this;
            
            var mergedOptions = LobiboxBase._processInput.call(me, options); 
            mergedOptions.buttons = {
                yes: BASE_OPTIONS.buttons.yes,
                no: BASE_OPTIONS.buttons.no
            };
            options = $.extend({}, mergedOptions, LobiboxConfirm.DEFAULT_OPTIONS, options);
            return options;
        },
        
        _init: function(){
            var me = this;
            
            LobiboxBase._init.call(me);
            me.show();
            var d = $('<div></div>');
            if (me.$options.iconClass){
                d.append($('<div class="lobibox-icon-wrapper"></div>')
                    .append('<i class="lobibox-icon '+me.$options.iconClass+'"></i>'))
                    ;
            }
            d.append('<div class="lobibox-body-text-wrapper"><span class="lobibox-body-text">'+me.$options.msg+'</span></div>');
            me._setContent(d.html());
            
            me._position();
        }
    });
    
    LobiboxConfirm.DEFAULT_OPTIONS = {
        width           : 500,
        iconClass       : 'glyphicon glyphicon-question-sign'
    };
//------------------------------------------------------------------------------
//-------------------------LobiboxAlert------------------------------------------
//------------------------------------------------------------------------------
    function LobiboxAlert (type, options){
        this.$type      = type;

        options = $.extend({}, Lobibox.alert.DEFAULT_OPTIONS, Lobibox[type].DEFAULT_OPTIONS, options);

        this.$options   = this._processInput(options);

        this._init();
        this.debug(this);
    };

    LobiboxAlert.prototype = $.extend({}, LobiboxBase, {
        constructor: LobiboxAlert,

        _processInput: function(options){
            ALERT_OPTIONS = $.extend({}, LobiboxAlert.OPTIONS, Lobibox.alert.DEFAULTS);

            var me = this;
            var mergedOptions = LobiboxBase._processInput.call(me, options);
            mergedOptions.buttons = {
                ok: BASE_OPTIONS.buttons.ok
            };
            options = $.extend({}, mergedOptions, LobiboxAlert.DEFAULT_OPTIONS, options);
            if (options.iconClass === true){
                options.iconClass = ALERT_OPTIONS[me.$type].iconClass;
            }

            return options;
        },

        _init: function(){
            var me = this;
            LobiboxBase._init.call(me);
            me.show();

            var d = $('<div></div>');
            if (me.$options.iconClass){
                d.append($('<div class="lobibox-icon-wrapper"></div>')
                    .append('<i class="lobibox-icon '+me.$options.iconClass+'"></i>'))
                    ;
            }
            d.append('<div class="lobibox-body-text-wrapper"><span class="lobibox-body-text">'+me.$options.msg+'</span></div>');
            window.console.log(me.$options.animationClass);
            me._setContent(d.html());
            me._position();
        }
    });
    LobiboxAlert.OPTIONS = {
        warning: {
            iconClass: 'glyphicon glyphicon-question-sign'
        },
        info:{
            iconClass: 'glyphicon glyphicon-info-sign'
        },
        success: {
            iconClass: 'glyphicon glyphicon-ok-sign'
        },
        error: {
            iconClass: 'glyphicon glyphicon-remove-sign'
        }
    };
    //User can set default options by this variable
    Lobibox.alert.DEFAULTS = {};
    LobiboxAlert.DEFAULT_OPTIONS = {
        iconClass       : true  // This means that alert messageboxes have icon by default taken from DEFAULTS object
    };
    var ALERT_OPTIONS = $.extend({}, LobiboxAlert.DEFAULT_OPTIONS, Lobibox.alert.DEFAULTS);
//------------------------------------------------------------------------------
//-------------------------LobiboxProgress--------------------------------------
//------------------------------------------------------------------------------
    function LobiboxProgress (options){
        this.$type      = 'progress';
        this.$progressBarElement = null,
        options = $.extend({}, Lobibox.progress.DEFAULT_OPTIONS, options);
        
        this.$options   = this._processInput(options);
        this.$progress  = 0;
        
        this._init();
        this.debug(this);
    };
    
    LobiboxProgress.prototype = $.extend({}, LobiboxBase, {
        constructor: LobiboxProgress,
        
        _processInput: function(options){
            var me = this;
            var mergedOptions = LobiboxBase._processInput.call(me, options); 
             
            options = $.extend({}, mergedOptions, LobiboxProgress.DEFAULT_OPTIONS, options);
            return options;
        },
        _init: function(){
            var me = this;
            
            LobiboxBase._init.call(me);
            me.show();
            if (me.$options.progressBarHTML){
                me.$progressBarElement = $(me.$options.progressBarHTML);
            }else{
                me.$progressBarElement = me._createProgressbar();
            }
            var label;
            if (me.$options.label){
                label = $('<label>'+me.$options.label+'</label>');
            }
            var innerHTML = $('<div></div>').append(label, me.$progressBarElement);
            me._setContent(innerHTML);
            me._position();
        },
        _createProgressbar: function(){
            var me = this;
            var outer = $('<div class="lobibox-progress-bar-wrapper lobibox-progress-outer"></div>')
                    .append('<div class="lobibox-progress-bar lobibox-progress-element"></div>')
                    ;
            if (me.$options.showProgressLabel){
                outer.append('<span class="lobibox-progress-text" data-role="progress-text"></span>');
            }
           
            return outer;
        },
        /**
         * Set progress value
         * 
         * @param {Integer} progress "progress value"
         * @returns {Instance}
         */
        setProgress: function(progress){
            var me = this;
            if (me.$progress === 100){
                return;
            }
            progress = Math.min(100, Math.max(0, progress)).toFixed(1);
            me.$progress = progress;
            me._triggerEvent('progressUpdated');
            if (me.$progress === 100){
                me._triggerEvent('progressCompleted');
            }
            me.$el.find('.lobibox-progress-element').css('width', progress+"%");
            me.$el.find('[data-role="progress-text"]').html(progress+"%");
            return me;
        },
        /**
         * Get progress value
         * 
         * @returns {Integer}
         */
        getProgress: function(){
            return this.$progress;
        }
    });
    
    LobiboxProgress.DEFAULT_OPTIONS = {
        width               : 500,
        showProgressLabel   : true,  // Show percentage of progress
        label               : '',  // Show progress label
        progressBarHTML     : false,  //Template of progress bar
        
        //Events
        progressUpdated     : null,
        progressCompleted   : null
    };
//------------------------------------------------------------------------------
//-------------------------LobiboxWindow----------------------------------------
//------------------------------------------------------------------------------
    function LobiboxWindow(type, options) {
        this.$type = type;
        
        options = $.extend({}, Lobibox.window.DEFAULT_OPTIONS, options);
        
        this.$options = this._processInput(options);

        this._init();
        this.debug(this);
    }
    ;

    LobiboxWindow.prototype = $.extend({}, LobiboxBase, {
        constructor: LobiboxWindow,
        _processInput: function(options) {
            var me = this;
            var mergedOptions = LobiboxBase._processInput.call(me, options);
            
            if (options.content && typeof options.content === 'function'){
                options.content = options.content();
            }
            if (options.content instanceof jQuery){
                options.content = options.content.clone();
            }
            options = $.extend({}, mergedOptions, LobiboxWindow.DEFAULT_OPTIONS, options);
            return options;
        },
        _init: function() {
            var me = this;

            LobiboxBase._init.call(me);
            me.setContent(me.$options.content);
            if (me.$options.url && me.$options.autoload){
                if ( ! me.$options.showAfterLoad){
                    me.show();
                    me._position();
                }
                me.load(function(){
                    if (me.$options.showAfterLoad) {
                        me.show();
                        me._position();
                    }
                });
            }else{
                me.show();
                me._position();
            }
        },
        /**
         * Setter method for <code>params</code> option
         * 
         * @param {Object} params "new params"
         * @returns {Instance}
         */
        setParams: function(params){
            var me = this;
            me.$options.params = params;
            return me;
        },
        /**
         * Getter method for <code>params</code>
         * 
         * @returns {Object}
         */
        getParams: function(){
            var me = this;
            return me.$options.params;
        },
        /**
         * Setter method of <code>loadMethod</code> option
         * 
         * @param {String} method "new method"
         * @returns {Instance}
         */
        setLoadMethod: function(method){
            var me = this;
            me.$options.loadMethod = method;
            return me;
        },
        /**
         * Getter method for <code>loadMethod</code> option
         * 
         * @returns {String}
         */
        getLoadMethod: function(){
            var me = this;
            return me.$options.loadMethod;
        },
        /**
         * Setter method of <code>content</code> option. 
         * Change the content of window
         * 
         * @param {String} content "new content"
         * @returns {Instance}
         */
        setContent: function(content){
            var me = this;
            me.$options.content = content;
            me.$el.find('.lobibox-body').html('').append(content);
            return me;
        },
        /**
         * Getter method of <code>content</code> option
         * 
         * @returns {String}
         */
        getContent: function(){
            var me = this;
            return me.$options.content;
        },
        /**
         * Setter method of <code>url</code> option
         * 
         * @param {String} url "new url"
         * @returns {Instance}
         */
        setUrl : function(url){
            this.$options.url = url;
            return this;
        },
        /**
         * Getter method of <code>url</code> option
         * 
         * @returns {String}
         */
        getUrl : function(){
            return this.$options.url;
        },
        /**
         * Loads content to window by ajax from specific url
         * 
         * @param {Function} callback "callback function"
         * @returns {Instance}
         */
        load: function(callback){
            var me = this;
            if ( ! me.$options.url){
                return me;
            }
            $.ajax(me.$options.url, {
                method: me.$options.loadMethod,
                data: me.$options.params
            }).done(function(res) {
                me.setContent(res);
                if (callback && typeof callback === 'function'){
                    callback(res);
                }
            });
            return me;
        }
    });

    LobiboxWindow.DEFAULT_OPTIONS = {
        width           : 480,
        height          : 600,
        content         : '',  // HTML Content of window
        url             : '',  // URL which will be used to load content
        draggable       : true,  // Override default option
        autoload        : true,  // Auto load from given url when window is created
        loadMethod      : 'GET',  // Ajax method to load content
        showAfterLoad   : true,  // Show window after content is loaded or show and then load content
        params          : {}  // Parameters which will be send by ajax for loading content
    };
     
    //User can set default options for messageboxes
    Lobibox.DEFAULT_OPTIONS = {
        window: LobiboxWindow.DEFAULT_OPTIONS
    };
})();


