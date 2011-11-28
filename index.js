/**
 * Created by IntelliJ IDEA.
 * User: mikayelaghasyan
 * Date: 11/28/11
 * Time: 11:05 PM
 * To change this template use File | Settings | File Templates.
 */

new Ext.Application({
	launch: function() {
		new Ext.Panel({
			fullscreen: true,
			dockedItems: [{xtype: 'toolbar', title: 'My First App'}],
			layout: 'fit',
			styleHtmlContent: true,
			html: '<h2>Hello Sencha!</h2>I did it!'
		});
	}
});