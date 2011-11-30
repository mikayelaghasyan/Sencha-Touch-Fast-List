/**
 * Created by IntelliJ IDEA.
 * User: mikayelaghasyan
 * Date: 11/29/11
 * Time: 2:22 AM
 * To change this template use File | Settings | File Templates.
 */
Ext.namespace('Ext.ux');

Ext.ux.FastList = Ext.extend(Ext.List, {
	minimumInvisibleItems: 5,
	maximumInvisibleItems: 20,

	initComponent: function() {
		Ext.ux.FastList.superclass.initComponent.call(this);

		if (this.grouped) {
			this.groupTpl = this.tpl;
		} else {
			this.listItemTpl = this.tpl;
		}
		// new template which will only be used for our proxies
		this.tpl = new Ext.XTemplate([
			'<tpl for=".">',
				'<div class="{id}"></div>',
			'</tpl>'
		]);
	},

	// don't handle all records, but only return three: top proxy, container, bottom proxy
	// actual content will be rendered to the container element in the scroll event handler
	collectData: function(records, startIndex) {
		return [{
			id: 'ux-list-top-proxy'
		}, {
			id: 'ux-list-container'
		}, {
			id: 'ux-list-bottom-proxy'
		}];
	},

	refresh: function() {
		Ext.ux.FastList.superclass.refresh.call(this);

		// locate our proxy and list container nodes
		this.topProxy = this.getTargetEl().down('.ux-list-top-proxy');
		this.bottomProxy = this.getTargetEl().down('.ux-list-bottom-proxy');
		this.listContainer = this.getTargetEl().down('.ux-list-container');

		this.initGroupInfo();
		this.onScroll(this.scroller, this.scroller.getOffset());
	},

	onScroll : function(scroller, pos, options) {
		if (this.listItemHeight === undefined) {
			this.initHeights();
		}
	},

	initHeights: function() {
		var store = this.store, storeCount = store.getCount();
		if (storeCount > 0) {
			var firstRecord = store.getAt(0);
			var data = [];
			var tpl;
			if (this.grouped) {
				tpl = this.groupTpl;
				var groupName = store.getGroupString(firstRecord);
				data[0] = {
					id: groupName.toLowerCase(),
					group: groupName,
					items: this.listItemTpl.apply([firstRecord.data])
				};
			} else {
				tpl = this.listItemTpl;
				data[0] = firstRecord.data;
			}
			tpl.overwrite(this.listContainer, data);
			var items = this.getTargetEl().query('div.x-list-item');
			if (items.length > 0) {
				this.listItemHeight = items[0].offsetHeight;
			}
			var headers = this.getTargetEl().query('h3.x-list-header');
			if (headers.length > 0) {
				this.listHeaderHeight = headers[0].offsetHeight;
			}
			tpl.overwrite(this.listContainer, []);
			console.log("List item height is: ", this.listItemHeight);
			console.log("List header height is: ", this.listHeaderHeight);
		}
	},

	initGroupInfo: function() {
		this.groupInfo = [];
		if (this.grouped) {
			var store = this.store, storeCount = store.getCount();
			if (storeCount > 0) {
				var i, key;
				var currentGroupInfo;
				for (i = 0; i < storeCount; i++) {
					key = store.getGroupString(store.getAt(i)).toLowerCase();
					if (currentGroupInfo === undefined) {
						currentGroupInfo = {key: key, startIndex: i};
					} else if (key !== currentGroupInfo['key']) {
						currentGroupInfo['count'] = i - currentGroupInfo['startIndex'];
						this.groupInfo[this.groupInfo.length] = currentGroupInfo;
						currentGroupInfo = {key: key, startIndex: i};
					}
				}
				currentGroupInfo['count'] = i - currentGroupInfo['startIndex'];
				this.groupInfo[this.groupInfo.length] = currentGroupInfo;
			}
		}
	}
});