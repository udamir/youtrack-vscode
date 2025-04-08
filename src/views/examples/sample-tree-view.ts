import * as vscode from 'vscode';
import { BaseTreeDataProvider, YouTrackTreeItem } from '../base-tree-view';
import { createEmptyItem, createErrorItem, createLoadingItem, sortTreeItemsAlphabetically } from '../tree-view-utils';

/**
 * Sample data item to represent in the tree
 */
interface SampleDataItem {
  id: string;
  name: string;
  hasChildren: boolean;
  children?: SampleDataItem[];
}

/**
 * Sample tree item implementation showcasing how to use the base tree infrastructure
 */
export class SampleTreeItem extends YouTrackTreeItem {
  constructor(
    public readonly dataItem: SampleDataItem,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    command?: vscode.Command
  ) {
    super(
      dataItem.name,
      collapsibleState,
      command,
      `youtrack-sample-${dataItem.hasChildren ? 'parent' : 'child'}`
    );

    // Set icon based on item type
    this.setThemeIcon(dataItem.hasChildren ? 'folder' : 'file');
    
    // Add identifier as description
    this.description = dataItem.id;
    
    // Add tooltip
    this.tooltip = `${dataItem.name} (${dataItem.id})`;
  }
}

/**
 * Sample tree data provider implementation to demonstrate the base infrastructure
 */
export class SampleTreeDataProvider extends BaseTreeDataProvider {
  private _items?: SampleDataItem[];
  private _loading = false;
  private _error?: Error;

  /**
   * Load data from the API
   */
  public async loadData(): Promise<void> {
    try {
      this._loading = true;
      this._error = undefined;
      this.refresh();
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Sample data
      this._items = [
        {
          id: 'parent1',
          name: 'Parent Item 1',
          hasChildren: true,
          children: [
            { id: 'child1', name: 'Child Item 1', hasChildren: false },
            { id: 'child2', name: 'Child Item 2', hasChildren: false }
          ]
        },
        {
          id: 'parent2',
          name: 'Parent Item 2',
          hasChildren: true,
          children: [
            { id: 'child3', name: 'Child Item 3', hasChildren: false }
          ]
        }
      ];
    } catch (error) {
      this._error = error instanceof Error ? error : new Error(String(error));
    } finally {
      this._loading = false;
      this.refresh();
    }
  }

  /**
   * Get children based on element
   */
  protected async getConfiguredChildren(element?: YouTrackTreeItem): Promise<YouTrackTreeItem[]> {
    // Show loading state
    if (this._loading) {
      return [createLoadingItem()];
    }

    // Show error state
    if (this._error) {
      return [createErrorItem(this._error.message)];
    }

    // If we don't have items yet, load them
    if (!this._items) {
      this.loadData();
      return [createLoadingItem()];
    }

    // If element is undefined, we're at the root
    if (!element) {
      if (this._items.length === 0) {
        return [createEmptyItem('No sample items found')];
      }

      // Create tree items for the root level
      return sortTreeItemsAlphabetically(
        this._items.map(item => this.createSampleTreeItem(item))
      );
    }
    
    // If element is defined, we need to get its children
    if (element instanceof SampleTreeItem && element.dataItem.hasChildren) {
      const children = element.dataItem.children || [];
      
      if (children.length === 0) {
        return [createEmptyItem('No children')];
      }
      
      return children.map(child => this.createSampleTreeItem(child));
    }
    
    return [];
  }

  /**
   * Create a sample tree item from data
   */
  private createSampleTreeItem(data: SampleDataItem): SampleTreeItem {
    const collapsibleState = data.hasChildren
      ? vscode.TreeItemCollapsibleState.Collapsed
      : vscode.TreeItemCollapsibleState.None;
      
    const command = data.hasChildren 
      ? undefined 
      : {
          command: 'youtrack.openSampleItem',
          title: 'Open Sample Item',
          arguments: [data]
        };
        
    return new SampleTreeItem(data, collapsibleState, command);
  }
}
