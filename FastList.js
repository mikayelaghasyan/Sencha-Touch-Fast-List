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

		this.groupHeaderTpl = new Ext.XTemplate([
			'<h3 class="x-list-header">{group}</h3>'
		]);

		this.isUpdating = false;
	},

	// @private
	initEvents : function() {
		Ext.ux.FastList.superclass.initEvents.call(this);
		// Remove listeners added by base class, these are all overridden
		// in this implementation.
		this.mun(this.scroller, {
			scrollstart: this.onScrollStart,
			scroll: this.onScroll,
			scope: this
		});
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
			this.header.show();
			this.header.dom.innerHTML = store.getGroupString(firstRecord);
			this.header.hide();
		}
	},

	initGroupInfo: function() {
		this.groupInfo = [];
		if (this.grouped) {
			var store = this.store, storeCount = store.getCount();
			var i, j, key, groupName;
			var currentGroupInfo;
			if (storeCount > 0) {
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

			if (!!this.indexBar) {
				store = this.indexBar.store, storeCount = store.getCount();
				for (i = 0; i < storeCount; i++) {
					var indexKey = store.getAt(i).get('key').toLowerCase();
					for (j = 0; j < this.groupInfo.length; j++) {
						var group = this.groupInfo[j];
						if (group['key'] === indexKey) {
							group['index'] = i;
							break;
						}
					}
				}
			}
		}
	},

	// @private - override
	afterRender: function() {
		Ext.ux.FastList.superclass.afterRender.apply(this, arguments);

		// set up listeners which will trigger rendering/cleanup of our sliding window of items
		this.mon(this.scroller, {
			scroll: this.renderOnScroll,
//			scrollend: this.onScrollStop,
			scope: this
		});

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
			_this.renderOnScroll(_this.scroller, _this.scroller.getOffset());
		}, 100);
	},

	renderOnScroll : function(scroller, pos, options) {
		if (this.isUpdating) {
			return;
		}

		if (this.listItemHeight === undefined) {
			this.initHeights();
		}

		if (this.grouped) {
			this.updateGroupHeader(pos.y);
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

		this.isUpdating = true;
//		tpl.overwrite(this.listContainer, data);
		this.listContainer.update(tpl.applyTemplate(data));
		this.topProxy.setHeight(this.getHeightBeforeIndex(this.firstRenderedIndex));
		this.bottomProxy.setHeight(this.getHeightAfterIndex(this.lastRenderedIndex));
		this.isUpdating = false;
	},

	// @private
	onIndex : function(record, target, index) {
		var currentY = 0;
		for (var i = 0; i < this.groupInfo.length; i++) {
			var group = this.groupInfo[i];
			var nextGroup = (i < this.groupInfo.length - 1 ? this.groupInfo[i + 1] : null);
			if (nextGroup !== null && nextGroup['index'] <= index) {
				currentY += this.listHeaderHeight + this.listItemHeight * group['count'];
			} else {
				break;
			}
		}
		this.scroller.updateBoundary();
		this.scroller.scrollTo({x: 0, y: currentY}, false);
	},

	updateGroupHeader: function(y) {
		var group = this.getGroupNameAndNextOffsetAtY(y);
		if (group == null) {
			this.header.hide();
		} else {
			this.header.show();
			this.header.dom.innerHTML = group['name'];
			if (group['nextOffset'] - y <= this.listHeaderHeight) {
				var transform = this.listHeaderHeight- (group['nextOffset'] - y);
				Ext.Element.cssTranslate(this.header, {x: 0, y: -transform});
				this.transformed = true;
			} else if (this.transformed) {
				this.header.setStyle('-webkit-transform', null);
				this.transformed = false;
			}
		}
	},

	getGroupNameAndNextOffsetAtY: function(y) {
		if (this.grouped) {
			var currentY = 0;
			var group;
			for (var i = 0; i < this.groupInfo.length; i++) {
				group = this.groupInfo[i];
				if (currentY > y) {
					break;
				} else {
					currentY += this.listHeaderHeight + this.listItemHeight * group['count'];
					if (currentY <= y) {
						continue;
					} else {
						return {name: group['name'], nextOffset: currentY};
					}
				}
			}
		}
		return null;
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