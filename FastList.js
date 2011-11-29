/**
 * Created by IntelliJ IDEA.
 * User: mikayelaghasyan
 * Date: 11/29/11
 * Time: 2:22 AM
 * To change this template use File | Settings | File Templates.
 */
Ext.namespace('Ext.ux');

Ext.ux.FastList = Ext.extend(Ext.List, {
	initComponent: function() {
		Ext.ux.FastList.superclass.initComponent.call(this);

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
		this.initGroupInfo();
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