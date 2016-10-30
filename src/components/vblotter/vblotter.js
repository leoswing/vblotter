import Vue from 'vue';
require('./vblotter.css');

export function VBlotter() {
	var VBotter = Vue.extend({
		template: '<grid :selected-num.sync = "selectedNum" :selected-list.sync = "selectedList" :column-options.sync = "columnOptions" :quick-filter = "quickFilter" :blotter-title.sync = "blotterTitle" :context-menu.sync = "contextMenu"></grid>',
        props: ['selectedNum', 'selectedList', 'girdData', 'columnOptions', 'quickFilter', 'blotterTitle', 'contextMenu'],
        data: function {},
        watch: {
        	'gridData': function() {
        		applyData(this);
        	}
        },		
        ready: function() {
        	applyData(this);
        	this.selectedList = [];
        },
	});

	function applyData(blotter) {
		blotter.$broadcast('gridData', processData(blotter));
	}
    
    // This function is totally the control function which will extend and handle the data passed in
	function processData(blotter) {
		var tableData = blotter.gridData;
		return tableData;
	}

	var Grid = Vue.extend({
		template: require('./vblotter.html'),
		props: ['selectedNum', 'selectedList', 'columnOptions', 'quickFilter', 'blotterTitle', 'contextMenu'],
		events: {
			gridData: 'processGridData',
			closeAllOpenedDropdown: 'closeOtherOpenedActionBtns'
		},
		data: function() {
			return {
				columnFields: [],
				sortKey: '',
				sortOrders: {},
				gridData: [],
				pageControl: {
					isAllSelected: false
				},
				isBlotterOverlap: false,
				blotterDataControl: {
					list: [],
					limit: 10
				},
				blotterControl: {
					blotterHeight: 0,
					tableBodyHeight: 0,
					isBlotterContentVisible: true,
					isMaxState: false
				},
				blotterHeaderControl: {
					isFieldResized: false,
					mouseStartX: 0,
					startFieldWidth: 0,
					columnIndex: 0
				}
			}
		},
		ready: function() {
			this.initSortOrders();
			this.regEventListener();
			this.scrollTarget();
		},
		watch: {
			'selectedRowsNum': function(selectedRows) {
				this.selectedNum = selectedRows;
				if (selectedRows > 0 && selectedRows === this.gridData.length) {
					this.pageControl.isAllSelected = true;
				} else {
					this.pageControl.isAllSelected = false;
				}
			}
		},
		computed: {
			selectedRowsNum: function() {
				if (this.selectedList) {
					return this.selectedList.length;
				}
			},
			sortedData: function() {
				var sortKey = this.sortKey;
				var order = this.sortOrders[sortKey] || 1;
				var data = this.gridData;
				if (sortKey) {
					data = data.slice().sort(function(a, b) {
						a = a[sortKey];
						b = b[sortKey];
						return (a === b ? 0 : a > b? 1 : -1)* order;
					})
				}
				return data;
			}
		},
		methods: {
			processGridData: function(gridData) {
				this.gridData = gridData;
				if (this.gridData.length > 0) {
					this.gridData.forEach(function(item) {
						Vue.set(item, 'menuDropdownOpen', false);
						Vue.set(item, 'isAllSelected', this.pageControl.isAllSelected ? true : false);
					}.bind(this));
				} else {
					this.pageControl.isAllSelected = false;
				}
				synchronizeSelectedList(this);
			},
			initSortOrders: function() {
				var vm = this;
				this.columnOptions.forEach(function(columnOption) {
					this.columnFields.push(columnOption.field);
					Vue.set(this.sortOrders, columnOption.field, 1);
				}.bind(this));
			},
			sortBy: function(key) {
				if (key === 'CHECK_BOX' || key === 'CONTEXT_BTN') {
					return;
				} 
				this.sortKey = key;
				this.sortOrders[key] = this.sortOrders[key] * -1;
			},
			isDashMarkDisplay: function(currentField, fieldContent) {
				if (!fieldContent && currentField !== 'CONTEXT_BTN') {
					return true;
				} else {
					return false;
				}
			},
			handleClickActionBtn: function(item, $event) {
				item.menuDropdownOpen = !item.menuDropdownOpen;
				$event.stopPropagation();
				this.closeOtherOpenedActionBtns(item);
			},
			closeOtherOpenedActionBtns: function(keepOpenItem) {
				if (keepOpenItem) {
					this.gridData.forEach(function(item) {
						if (item !== keepOpenItem && item.menuDropdownOpen) {
							item.menuDropdownOpen = false;
						}
					});
				} else {
					this.gridData.forEach(function(item) {
						if (item.menuDropdownOpen) {
							item.menuDropdownOpen = false;
						}
					});
				}
			},
			handleClickSelectAllCheckBox: function() {
				var capture = function() {
					return this.pageControl.isAllSelected
				}.bind(this);
				synchronizeBoundedValue(capture, this.pageControl.isAllSelected).then(function() {
					this.gridData.forEach(function(item) {
						if (item.isSelected !== this.pageControl.isAllSelected) {
							item.isSelected = this.pageControl.isAllSelected;
						}
					}.bind(this));
					if (this.pageControl.isAllSelected) {
						synchronizeSelectedList(this);
					} else {
						this.selectedList = [];
					}
				}.bind(this));
			},
			handleClickCheckBox: function() {
				var capture = function() {
					return item.isAllSelected;
				}.bind(this);
				synchronizeBoundedValue(capture, item.isAllSelected).then(function() {
					Vue.nextTick(function() {
						synchronizeSelectedList(this);
					}.bind(this));
				}.bind(this));
			},
			hideBlotter: function() {
				$('.blotter-panel').hide();
			},
			getWidth: function(td) {
				let tdWidth = 0;
				if (td.currentStyle) {
					tdWidth = td.currentStyle.width;
				} else {
					tdWidth = getComputedStyle(td, false).width;
				}
				return tdWidth;
			},
			addTableRow: function(table) {
				let currentRows = table.rows.length,
				    currentTds  = table.rows[0].cells.length,
				    trInserted  = table.insertRow(currentRows);

			    for (let i = 0; i < currentTds; i++) {
			    	trInserted.insertCell(i);
			    }

			},
			scrollTarget: function() {
				var target = $('.table-header');
				$('.table-body').scroll(function() {
					target.prop('scrollLeft', this.scrollLeft);
				});
			},
			resizeWindowBlotter: function() {
				let el = this.$el;
				let containerHeight   = document.getElementsByClassName('container-fluid')[0].clientHeight,
				    tableHeaderHeight = document.getElementsByClassName('table-header')[0].offsetHeight,
				    eachRowHeight     = document.querySelectorAll('.table-tbody tr.table-loop')[0].offsetHeight;
				let bodyScrollHeight  = containerHeight - tableHeaderHeight - eachRowHeight;

				if (this.isBlotterOverlap) {
					$('.table-body').css({'max-height': bodyScrollHeight});
					$('.blotter-wrapper').css({'max-height': containerHeight});
				}
			},
			calculateAndMax: function() {
				var self = this;
				let expandFlag = false;

				let containerHeight = document.getElementsByClassName('container-fluid')[0].offsetHeight,
                    eachRowHeight   = document.querySelectorAll('.table-tbody tr.table-loop')[0].clientHeight,
                    scrollTableBody = document.querySelector('.scroll-table-body'),
                    blotterHeadHeight = document.querySelector('.blotter-head').offsetHeight,
                    tableHeaderHeight = document.querySelector('div.table-header').clientHeight;
                let tableRows = scrollTableBody.rows.length;

                this.blotterControl.blotterHeight = document.getElementsByClassName('blotter-wrapper')[0].offsetHeight;
                this.blotterControl.tableBodyHeight = document.getElementsByClassName('table-body')[0].offsetHeight;

                let totalTolerateRows = Math.floor((containerHeight - blotterHeadHeight) / eachRowHeight);

                // if current container's height does not achieve the total web page height except header, then empty tags of row needed be inserted
                if (totalTolerateRows > (tableRows +1)) {
                	expandFlag = true;
                	let rowsNeeded = totalTolerateRows - (tableRows + 1);
                	for (let i = 0; i < rowsNeeded; i++) {
                		self.addTableRow(scrollTableBody);
                	}
                }

                // after calculate and insert tags, we need to set table body max-height and blotter-wrapper max height
                let bodyScrollHeight = containerHeight - blotterHeadHeight - tableHeaderHeight;

                $('.table-body').css({'max-height': bodyScrollHeight});

                if (expandFlag) {
                	this.isBlotterOverlap = true;
                } else {
                	this.isBlotterOverlap = false;
                }

            	$('.blotter-wrapper').css({'max-height': containerHeight});
			},
			maxBlotter: function() {
				var self = this;

				if (!this.blotterControl.isBlotterContentVisible) {
					this.blotterControl.isBlotterContentVisible = true;
					Vue.nextTick(function() {
						self.calculateAndMax();
					});
				} else {
					self.calculateAndMax();
				}
				this.blotterControl.isMaxState = true;
			},
			minBlotter: function() {

				// remove the empty tags that generaed by maxBlotter function
				$('.table-tbody tr:not(.table-loop)').remove();

				// reset max-height of table-body and blotter-wrapper
				$('.table-body').css({'max-height': this.tableBodyHeight});
				if (this.blotterControl.isMaxState) {
					$('.blotter-wrapper').css({'max-height': this.blotterHeight});
				}
				this.blotterControl.isBlotterContentVisible = false;
				this.isBlotterOverlap = false;
				this.blotterControl.isMaxState = false;
			},
			formatThousandSep: function(fieldInput) {
				if (isNaN(fieldInput)) {
					return fieldInput;
				} else {
					let translateStr = '';
					let reg = /(\d{1,3})(?=(\d{3})+(?:$|\.))/g;
					translateStr = fieldInput.toString().replace(reg, '$1,');
					return translateStr;
				}
			},
			toDecimal: function(field) {
				if (field.length == 0) {
					return;
				} else {
					var fieldString = field.toString();
					var rs = fieldString.indexOf('.');
					if (rs < 0) {
						rs = fieldString.length;
						fieldString += '.';
					}
					while (fieldString.length <= rs + 2) {
						fieldString += '0';
					}
					return fieldString;
				}
			},
			formatThousandToNum: function(thousFieldInput) {
				var numberTransform = thousFieldInput.toString().replace(/,/g, '');
				return numberTransform;
			},
			handleTableHeadMousedown: function($event, index) {
				if ($event) {
					$event.preventDefault();
				}
				this.blotterHeaderControl.isFieldResized = true;
				this.blotterHeaderControl.mouseStartX = $event.pageX;
				this.blotterHeaderControl.columnIndex = index;
				this.blotterHeaderControl.startFieldWidth = $('.table-thead th:eq(' + index + ') div').width();
			},
			handleTableHeadMousemove: function($event) {
				if (this.blotterHeaderControl.isFieldResized) {
					var adjustWidth = this.blotterHeaderControl.startFieldWidth + ($event.pageX - this.blotterHeaderControl.mouseStartX);

					// for we need to use nth-child css rule to overwrite the original one, so we add a new variable for current index plus one
					var index = this.blotterHeaderControl.columnIndex + 1;

					$('.table-header table th:nth-child(' + index + ') div').width(adjustWidth);
					Vue.nextTick(function() {
						$('.table-body table td:nth-child(' + index + ') div').width(adjustWidth);
					});
				}
			},
			handleTableHeadMouseup: function() {
				if (this.blotterHeaderControl.isFieldResized) {
					this.blotterHeaderControl.isFieldResized = false;
				}
			},
			regEventListener: function() {
				window.addEventListener('resize', this.resizeWindowBlotter);
				window.addEventListener('mousemove', this.handleTableHeadMousemove);
				window.addEventListener('mouseup', this.handleTableHeadMouseup);
			}

		},
		beforeDestroy: function() {
			window.removeEventListener('resize', this.resizeWindowBlotter);
			window.removeEventListener('mousemove', this.handleTableHeadMousemove);
			window.removeEventListener('mouseup', this.handleTableHeadMouseup);
		}
	});

	function synchronizeSelectedList(blotter) {
		blotter.selectedList = [];
		blotter.gridData.forEach(function(item) {
			if (item.isSelected) {
				blotter.selectedList.push(simplifyItem(item));
			}
		});
	}

	function simplifyItem(item) {
		var clonedItem = jQuery.extend(true, {}, item);
		delete clonedItem['menuDropdownOpen'];
		delete clonedItem['isSelected'];
		delete clonedItem;
	}

	function synchronizedBoundedValue(capturedValue, boundedValue) {
		return new Promise(function(resolve) {
			var i = 0;
			var loop = setInterval(function() {
				if (boundedValue !== capturedValue) {
					clearInterval(loop);
					resolve();
				} else {
					if (i == 2) {
						clearInterval(loop);
						resolve();
					}
				}
				i++;
			}.bind(this), 10);
		}.bind(this));
	}

	Vue.component('vblotter', VBlotter);
	Vue.component('grid', Grid);
}
