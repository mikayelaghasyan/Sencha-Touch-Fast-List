/**
 * Created by IntelliJ IDEA.
 * User: mikayelaghasyan
 * Date: 11/29/11
 * Time: 2:22 AM
 * To change this template use File | Settings | File Templates.
 */
Ext.namespace('Ext.ux');

Ext.ux.FastList = Ext.extend(Ext.List, {
	minimumInvisibleItems: 1,
	maximumInvisibleItems: 5,

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

		this.firstRenderedIndex = -1;
		this.lastRenderedIndex = -1;

		this.initGroupInfo();
		var _this = this;
		Ext.defer(function() {
			_this.onScroll(_this.scroller, _this.scroller.getOffset());
		}, 100);
	},

	onScroll : function(scroller, pos, options) {
		var startTime = new Date();

		if (this.listItemHeight === undefined) {
			this.initHeights();
		}

		var storeCount = this.store.getCount();
		var startIndex = this.getItemIndexAtY(pos.y);
		var endIndex = this.getItemIndexAtY(pos.y + this.getHeight());
		if (this.firstRenderedIndex <= Math.max(startIndex - this.minimumInvisibleItems, 0) &&
				this.lastRenderedIndex >= Math.min(endIndex + this.minimumInvisibleItems, storeCount - 1)) {
			return;
		}
		this.firstRenderedIndex = Math.max(startIndex - this.maximumInvisibleItems, 0);
		this.lastRenderedIndex = Math.min(endIndex + this.maximumInvisibleItems, storeCount - 1);

		var data = this.getDataForRange(this.firstRenderedIndex, this.lastRenderedIndex);
		var tpl = this.grouped ? this.groupTpl : this.listItemTpl;
		tpl.overwrite(this.listContainer, data);

		this.topProxy.setHeight(this.getHeightBeforeIndex(this.firstRenderedIndex));
		this.bottomProxy.setHeight(this.getHeightAfterIndex(this.lastRenderedIndex));

		var endTime = new Date();
		console.log("onScroll took " + (endTime.getTime() - startTime.getTime()) + " milliseconds");
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
				var i, key, groupName;
				var currentGroupInfo;
				for (i = 0; i < storeCount; i++) {
					groupName = store.getGroupString(store.getAt(i));
					key = groupName.toLowerCase();
					if (currentGroupInfo === undefined) {
						currentGroupInfo = {key: key, name: groupName, startIndex: i};
					} else if (key !== currentGroupInfo['key']) {
						currentGroupInfo['count'] = i - currentGroupInfo['startIndex'];
						this.groupInfo[this.groupInfo.length] = currentGroupInfo;
						currentGroupInfo = {key: key, name: groupName, startIndex: i};
					}
				}
				currentGroupInfo['count'] = i - currentGroupInfo['startIndex'];
				this.groupInfo[this.groupInfo.length] = currentGroupInfo;
			}
		}
	},

	getItemIndexAtY: function(y) {
		var currentY = 0;
		if (this.grouped) {
			var group;
			for (var i = 0; i < this.groupInfo.length; i++) {
				group = this.groupInfo[i];
				if (currentY + this.listHeaderHeight + this.listItemHeight * group['count'] <= y) {
					currentY += this.listHeaderHeight + this.listItemHeight * group['count'];
				} else {
					return (group['startIndex'] + Math.floor(Math.max(y - currentY - this.listHeaderHeight, 0) / this.listItemHeight));
				}
			}
			if (group !== undefined) {
				return (group['startIndex'] + group['count'] - 1);
			}
		} else {
			var storeCount = this.store.getCount();
			return Math.min(Math.floor(y / this.listItemHeight), storeCount - 1);
		}
		return -1;
	},

	getDataForRange: function(startIndex, endIndex) {
		var data;
		var i;
		if (this.grouped) {
			data = [];
			for (i = 0; i < this.groupInfo.length; i++) {
				var group = this.groupInfo[i];
				if (group['startIndex'] + group['count'] <= startIndex) {
					continue;
				}
				if (group['startIndex'] > endIndex) {
					break;
				}
				data[data.length] = {
					id: group['key'],
					group: group['name'],
					items: this.listItemTpl.apply(
							this.getItemsForRange(Math.max(startIndex, group['startIndex']),
									Math.min(endIndex, group['startIndex'] + group['count'] - 1)))
				};
			}
		} else {
			data = this.getItemsForRange(startIndex, endIndex);
		}
		return data;
	},

	getItemsForRange: function(startIndex, endIndex) {
		var items = [];
		for (i = startIndex; i <= endIndex; i++) {
			items[items.length] = this.store.getAt(i).data;
		}
		return items;
	},

	getHeightBeforeIndex: function(index) {
		var height = 0;
		if (this.grouped) {
			var i;
			for (i = 0; i < this.groupInfo.length; i++) {
				var group = this.groupInfo[i];
				if (group['startIndex'] + group['count'] <= index) {
					height += this.listHeaderHeight + this.listItemHeight * group['count'];
				} else {
					height += this.listItemHeight * (index - group['startIndex']);
					break;
				}
			}
		} else {
			height = this.listItemHeight * index;
		}
		return height;
	},

	getHeightAfterIndex: function(index) {
		var height = 0;
		if (this.grouped) {
			var i;
			for (i = this.groupInfo.length - 1; i >= 0 ; i--) {
				var group = this.groupInfo[i];
				if (group['startIndex'] > index) {
					height += this.listHeaderHeight + this.listItemHeight * group['count'];
				} else {
					height += this.listItemHeight * (group['startIndex'] + group['count'] - index - 1);
					break;
				}
			}
		} else {
			height = this.listItemHeight * (this.store.getCount() - index - 1);
		}
		return height;
	}
});