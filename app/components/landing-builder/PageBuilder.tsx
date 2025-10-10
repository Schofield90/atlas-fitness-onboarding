"use client";

import React, { useState, useCallback, useRef } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import * as Components from "./components";
import {
  GripVertical,
  Trash2,
  Settings,
  Copy,
  Eye,
  Save,
  Undo,
  Redo,
  Plus,
  Image,
  Type,
  Square,
  Columns,
  Video,
  Code,
  Mail,
  ChevronDown,
} from "lucide-react";

// Component types
export const COMPONENT_TYPES = {
  HEADER: "header",
  HERO: "hero",
  TEXT: "text",
  IMAGE: "image",
  VIDEO: "video",
  BUTTON: "button",
  FORM: "form",
  FEATURES: "features",
  TESTIMONIALS: "testimonials",
  PRICING: "pricing",
  FAQ: "faq",
  CTA: "cta",
  FOOTER: "footer",
  COLUMNS: "columns",
  SPACER: "spacer",
  DIVIDER: "divider",
  COUNTDOWN: "countdown",
  SOCIAL: "social",
  HTML: "html",
};

// Component renderer
const ComponentRenderer: React.FC<{
  component: Component;
  isEditing?: boolean;
  onUpdate?: (updates: any) => void;
  onAIRewrite?: (field: string) => void;
}> = ({ component, isEditing = true, onUpdate, onAIRewrite }) => {
  const { type, props } = component;

  switch (type) {
    case COMPONENT_TYPES.HEADER:
      return <Components.HeaderComponent {...props} />;
    case COMPONENT_TYPES.HERO:
      return (
        <Components.HeroComponent
          {...props}
          isEditing={isEditing}
          onUpdate={(field, value) => onUpdate?.({ [field]: value })}
          onAIRewrite={onAIRewrite}
        />
      );
    case COMPONENT_TYPES.TEXT:
      return (
        <Components.EditableTextComponent
          {...props}
          isEditing={isEditing}
          onUpdate={(value) => onUpdate?.({ content: value })}
          onAIRewrite={() => onAIRewrite?.("content")}
        />
      );
    case COMPONENT_TYPES.IMAGE:
      return <Components.ImageComponent {...props} />;
    case COMPONENT_TYPES.BUTTON:
      return <Components.ButtonComponent {...props} />;
    case COMPONENT_TYPES.FORM:
      return <Components.FormComponent {...props} />;
    case COMPONENT_TYPES.FEATURES:
      return <Components.FeaturesComponent {...props} />;
    case COMPONENT_TYPES.TESTIMONIALS:
      return <Components.TestimonialsComponent {...props} />;
    case COMPONENT_TYPES.PRICING:
      return <Components.PricingComponent {...props} />;
    case COMPONENT_TYPES.FAQ:
      return <Components.FAQComponent {...props} />;
    case COMPONENT_TYPES.CTA:
      return <Components.CTAComponent {...props} />;
    case COMPONENT_TYPES.VIDEO:
      return <Components.VideoComponent {...props} />;
    case COMPONENT_TYPES.FOOTER:
      return <Components.FooterComponent {...props} />;
    case COMPONENT_TYPES.COLUMNS:
      return <Components.ColumnsComponent {...props} />;
    case COMPONENT_TYPES.SPACER:
      return (
        <div className="py-8" style={{ height: props.height || "64px" }} />
      );
    case COMPONENT_TYPES.DIVIDER:
      return <hr className="my-8 border-gray-700" />;
    case COMPONENT_TYPES.COUNTDOWN:
      return <Components.CountdownComponent {...props} />;
    case COMPONENT_TYPES.SOCIAL:
      return <Components.SocialIconsComponent {...props} />;
    case COMPONENT_TYPES.HTML:
      return <Components.HTMLComponent {...props} />;
    default:
      return (
        <div className="p-8 bg-gray-800 text-center text-gray-500">
          Component type "{type}" not implemented
        </div>
      );
  }
};

interface Component {
  id: string;
  type: string;
  props: any;
  children?: Component[];
}

interface PageBuilderProps {
  initialContent?: Component[];
  onSave?: (content: Component[]) => void;
  onPublish?: (content: Component[]) => void;
}

const PageBuilder: React.FC<PageBuilderProps> = ({
  initialContent = [],
  onSave,
  onPublish,
}) => {
  const [components, setComponents] = useState<Component[]>(initialContent);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(
    null,
  );
  const [history, setHistory] = useState<Component[][]>([initialContent]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showComponentLibrary, setShowComponentLibrary] = useState(true);
  const [showProperties, setShowProperties] = useState(true);

  // Add component to canvas
  const addComponent = useCallback(
    (type: string, props: any = {}) => {
      const newComponent: Component = {
        id: `component-${Date.now()}-${Math.random()}`,
        type,
        props: {
          ...getDefaultProps(type),
          ...props,
        },
      };

      const newComponents = [...components, newComponent];
      setComponents(newComponents);
      addToHistory(newComponents);
      setSelectedComponent(newComponent.id);
    },
    [components],
  );

  // Insert component at a specific index
  const addComponentAtIndex = useCallback(
    (index: number, type: string, props: any = {}) => {
      const newComponent: Component = {
        id: `component-${Date.now()}-${Math.random()}`,
        type,
        props: {
          ...getDefaultProps(type),
          ...props,
        },
      };
      const clampedIndex = Math.max(0, Math.min(index, components.length));
      const newComponents = [
        ...components.slice(0, clampedIndex),
        newComponent,
        ...components.slice(clampedIndex),
      ];
      setComponents(newComponents);
      addToHistory(newComponents);
      setSelectedComponent(newComponent.id);
    },
    [components],
  );

  // Update component
  const updateComponent = useCallback(
    (id: string, updates: Partial<Component>) => {
      const newComponents = components.map((comp) =>
        comp.id === id ? { ...comp, ...updates } : comp,
      );
      setComponents(newComponents);
      addToHistory(newComponents);
    },
    [components],
  );

  // Delete component
  const deleteComponent = useCallback(
    (id: string) => {
      const newComponents = components.filter((comp) => comp.id !== id);
      setComponents(newComponents);
      addToHistory(newComponents);
      setSelectedComponent(null);
    },
    [components],
  );

  // Duplicate component
  const duplicateComponent = useCallback(
    (id: string) => {
      const comp = components.find((c) => c.id === id);
      if (!comp) return;

      const newComponent: Component = {
        ...comp,
        id: `component-${Date.now()}-${Math.random()}`,
      };

      const index = components.findIndex((c) => c.id === id);
      const newComponents = [
        ...components.slice(0, index + 1),
        newComponent,
        ...components.slice(index + 1),
      ];
      setComponents(newComponents);
      addToHistory(newComponents);
    },
    [components],
  );

  // Move component
  const moveComponent = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      const newComponents = [...components];
      const draggedComponent = newComponents[dragIndex];
      newComponents.splice(dragIndex, 1);
      newComponents.splice(hoverIndex, 0, draggedComponent);
      setComponents(newComponents);
      addToHistory(newComponents);
    },
    [components],
  );

  // History management
  const addToHistory = (newComponents: Component[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newComponents);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setComponents(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setComponents(history[historyIndex + 1]);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen bg-gray-900">
        {/* Component Library */}
        <ComponentLibrary
          show={showComponentLibrary}
          onAddComponent={addComponent}
        />

        {/* Canvas */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <Toolbar
            onUndo={undo}
            onRedo={redo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            onSave={() => onSave?.(components)}
            onPublish={() => onPublish?.(components)}
            onToggleLibrary={() =>
              setShowComponentLibrary(!showComponentLibrary)
            }
            onToggleProperties={() => setShowProperties(!showProperties)}
          />

          {/* Canvas Area */}
          <div className="flex-1 overflow-auto bg-gray-800">
            <CanvasContainer
              onDropNewComponent={(type) => addComponent(type)}
              onDropNewComponentAtIndex={(index, type) =>
                addComponentAtIndex(index, type)
              }
            >
              <div className="min-h-full p-8" data-testid="builder-canvas">
                {components.length === 0 ? (
                  <EmptyCanvas
                    onAddComponent={addComponent}
                    onDropNewComponentAtIndex={(index, type) =>
                      addComponentAtIndex(index, type)
                    }
                  />
                ) : (
                  <div className="max-w-6xl mx-auto">
                    {components.map((component, index) => (
                      <DraggableComponent
                        key={component.id}
                        component={component}
                        index={index}
                        moveComponent={moveComponent}
                        updateComponent={updateComponent}
                        deleteComponent={deleteComponent}
                        duplicateComponent={duplicateComponent}
                        isSelected={selectedComponent === component.id}
                        onSelect={() => setSelectedComponent(component.id)}
                        onDropNewComponentAtIndex={(insertIndex, type) =>
                          addComponentAtIndex(insertIndex, type)
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </CanvasContainer>
          </div>
        </div>

        {/* Properties Panel */}
        {showProperties && selectedComponent && (
          <PropertiesPanel
            component={components.find((c) => c.id === selectedComponent)}
            onUpdate={(updates) => updateComponent(selectedComponent, updates)}
            onClose={() => setSelectedComponent(null)}
          />
        )}
      </div>
    </DndProvider>
  );
};

// Component Library Sidebar
const ComponentLibrary: React.FC<{
  show: boolean;
  onAddComponent: (type: string) => void;
}> = ({ show, onAddComponent }) => {
  if (!show) return null;

  const componentGroups = [
    {
      name: "Basic",
      components: [
        { type: COMPONENT_TYPES.HEADER, icon: Square, label: "Header" },
        { type: COMPONENT_TYPES.TEXT, icon: Type, label: "Text" },
        { type: COMPONENT_TYPES.IMAGE, icon: Image, label: "Image" },
        { type: COMPONENT_TYPES.BUTTON, icon: Square, label: "Button" },
        { type: COMPONENT_TYPES.COLUMNS, icon: Columns, label: "Columns" },
      ],
    },
    {
      name: "Content",
      components: [
        { type: COMPONENT_TYPES.HERO, icon: Square, label: "Hero Section" },
        { type: COMPONENT_TYPES.FEATURES, icon: Square, label: "Features" },
        {
          type: COMPONENT_TYPES.TESTIMONIALS,
          icon: Square,
          label: "Testimonials",
        },
        { type: COMPONENT_TYPES.PRICING, icon: Square, label: "Pricing" },
        { type: COMPONENT_TYPES.FAQ, icon: Square, label: "FAQ" },
      ],
    },
    {
      name: "Forms & CTAs",
      components: [
        { type: COMPONENT_TYPES.FORM, icon: Mail, label: "Form" },
        { type: COMPONENT_TYPES.CTA, icon: Square, label: "Call to Action" },
        { type: COMPONENT_TYPES.COUNTDOWN, icon: Square, label: "Countdown" },
      ],
    },
    {
      name: "Media",
      components: [
        { type: COMPONENT_TYPES.VIDEO, icon: Video, label: "Video" },
        { type: COMPONENT_TYPES.SOCIAL, icon: Square, label: "Social Icons" },
      ],
    },
    {
      name: "Layout",
      components: [
        { type: COMPONENT_TYPES.SPACER, icon: Square, label: "Spacer" },
        { type: COMPONENT_TYPES.DIVIDER, icon: Square, label: "Divider" },
        { type: COMPONENT_TYPES.HTML, icon: Code, label: "Custom HTML" },
        { type: COMPONENT_TYPES.FOOTER, icon: Square, label: "Footer" },
      ],
    },
  ];

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto">
      <div className="p-4">
        <h3 className="font-semibold text-white mb-4">Components</h3>
        {componentGroups.map((group) => (
          <div key={group.name} className="mb-6">
            <h4 className="text-sm font-medium text-gray-400 mb-2">
              {group.name}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {group.components.map((comp) => (
                <LibraryItem
                  key={comp.type}
                  comp={comp}
                  onAddComponent={onAddComponent}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Library item with drag source for new components
const LibraryItem: React.FC<{
  comp: { type: string; icon: any; label: string };
  onAddComponent: (type: string) => void;
}> = ({ comp, onAddComponent }) => {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: "new-component",
      item: { componentType: comp.type },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [comp],
  );

  return (
    <button
      ref={drag}
      data-testid={`palette-${comp.type}`}
      onClick={() => onAddComponent(comp.type)}
      className={`p-3 border border-gray-700 rounded-lg hover:bg-gray-700 hover:border-gray-600 transition-colors ${isDragging ? "opacity-50" : ""}`}
    >
      <comp.icon className="w-5 h-5 mx-auto mb-1 text-gray-400" />
      <span className="text-xs text-gray-300">{comp.label}</span>
    </button>
  );
};

// Canvas container drop zone for new components
const CanvasContainer: React.FC<{
  onDropNewComponent: (type: string) => void;
  onDropNewComponentAtIndex: (index: number, type: string) => void;
  children: React.ReactNode;
}> = ({ onDropNewComponent, onDropNewComponentAtIndex, children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [, drop] = useDrop(
    () => ({
      accept: "new-component",
      drop: (item: { componentType: string }, monitor) => {
        // If dropped on empty space, append to end
        onDropNewComponent(item.componentType);
      },
    }),
    [onDropNewComponent],
  );

  drop(containerRef);
  return <div ref={containerRef}>{children}</div>;
};

// Draggable Component Wrapper
const DraggableComponent: React.FC<{
  component: Component;
  index: number;
  moveComponent: (dragIndex: number, hoverIndex: number) => void;
  updateComponent: (id: string, updates: Partial<Component>) => void;
  deleteComponent: (id: string) => void;
  duplicateComponent: (id: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  onDropNewComponentAtIndex: (insertIndex: number, type: string) => void;
}> = ({
  component,
  index,
  moveComponent,
  updateComponent,
  deleteComponent,
  duplicateComponent,
  isSelected,
  onSelect,
  onDropNewComponentAtIndex,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: "component",
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: ["component", "new-component"],
    hover: (item: any) => {
      if (!ref.current) return;
      // Only handle reordering when dragging existing components
      if (typeof item?.index === "number") {
        const dragIndex = item.index;
        const hoverIndex = index;
        if (dragIndex === hoverIndex) return;
        moveComponent(dragIndex, hoverIndex);
        item.index = hoverIndex;
      }
    },
    drop: (item: any, monitor) => {
      if (!ref.current) return;
      // Handle dropping a new component from the library
      if (item && item.componentType) {
        const boundingRect = ref.current.getBoundingClientRect();
        const clientOffset = monitor.getClientOffset();
        const middleY = (boundingRect.top + boundingRect.bottom) / 2;
        const insertBefore = clientOffset ? clientOffset.y < middleY : true;
        const insertIndex = insertBefore ? index : index + 1;
        onDropNewComponentAtIndex(insertIndex, item.componentType);
      }
    },
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`group relative mb-4 ${isDragging ? "opacity-50" : ""} ${
        isSelected ? "ring-2 ring-blue-500 ring-offset-2" : ""
      }`}
      data-testid={`builder-component-${component.type}`}
      onClick={onSelect}
    >
      {/* Component Controls */}
      <div className="absolute -top-2 -left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
          <button className="p-1.5 hover:bg-gray-700 cursor-move" ref={preview}>
            <GripVertical className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              duplicateComponent(component.id);
            }}
            className="p-1.5 hover:bg-gray-700"
          >
            <Copy className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteComponent(component.id);
            }}
            className="p-1.5 hover:bg-gray-700"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      {/* Render Component */}
      <ComponentRenderer
        component={component}
        isEditing={true}
        onUpdate={(updates) =>
          updateComponent(component.id, {
            props: { ...component.props, ...updates },
          })
        }
        onAIRewrite={(field) => {
          // TODO: Implement AI rewrite handler
          console.log(`AI rewrite requested for ${component.type}.${field}`);
        }}
      />
    </div>
  );
};

// Toolbar
const Toolbar: React.FC<{
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onSave?: () => void;
  onPublish?: () => void;
  onToggleLibrary: () => void;
  onToggleProperties: () => void;
}> = ({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSave,
  onPublish,
  onToggleLibrary,
  onToggleProperties,
}) => {
  return (
    <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={onToggleLibrary}
            className="p-2 hover:bg-gray-100 rounded"
            title="Toggle Component Library"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-gray-300" />
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button className="p-2 hover:bg-gray-100 rounded" title="Preview">
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleProperties}
            className="p-2 hover:bg-gray-100 rounded"
            title="Properties"
          >
            <Settings className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-gray-300" />
          <button
            onClick={onSave}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            <Save className="w-4 h-4 inline mr-2" />
            Save
          </button>
          <button
            onClick={onPublish}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Publish
          </button>
        </div>
      </div>
    </div>
  );
};

// Properties Panel
const PropertiesPanel: React.FC<{
  component?: Component;
  onUpdate: (updates: Partial<Component>) => void;
  onClose: () => void;
}> = ({ component, onUpdate, onClose }) => {
  if (!component) return null;

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Properties</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="p-4">
        <ComponentProperties
          component={component}
          onUpdate={(props) =>
            onUpdate({ props: { ...component.props, ...props } })
          }
        />
      </div>
    </div>
  );
};

// Component Properties Editor
const ComponentProperties: React.FC<{
  component: Component;
  onUpdate: (props: any) => void;
}> = ({ component, onUpdate }) => {
  const props = component.props || {};

  const updateProp = (key: string, value: any) => {
    onUpdate({ [key]: value });
  };

  const renderEditor = (key: string, value: any) => {
    if (typeof value === "string") {
      const isLongText =
        key.toLowerCase().includes("content") ||
        key.toLowerCase().includes("subtitle") ||
        key.toLowerCase().includes("html") ||
        value.length > 60;
      if (isLongText) {
        return (
          <textarea
            className="w-full px-3 py-2 border border-gray-700 rounded bg-gray-900 text-gray-300"
            rows={4}
            value={value}
            onChange={(e) => updateProp(key, e.target.value)}
          />
        );
      }
      return (
        <input
          className="w-full px-3 py-2 border border-gray-700 rounded bg-gray-900 text-gray-300"
          value={value}
          onChange={(e) => updateProp(key, e.target.value)}
        />
      );
    }
    if (typeof value === "number") {
      return (
        <input
          type="number"
          className="w-full px-3 py-2 border border-gray-700 rounded bg-gray-900 text-gray-300"
          value={value}
          onChange={(e) => updateProp(key, Number(e.target.value))}
        />
      );
    }
    if (typeof value === "boolean") {
      return (
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => updateProp(key, e.target.checked)}
          />
          <span className="text-sm text-gray-300">Enabled</span>
        </label>
      );
    }
    // Fallback for arrays/objects
    return (
      <textarea
        className="w-full px-3 py-2 border border-gray-700 rounded bg-gray-900 text-gray-300 font-mono text-xs"
        rows={6}
        value={JSON.stringify(value, null, 2)}
        onChange={(e) => {
          try {
            const parsed = JSON.parse(e.target.value);
            updateProp(key, parsed);
          } catch {
            // ignore parse errors while typing
          }
        }}
      />
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">
          Component Type
        </label>
        <input
          type="text"
          value={component.type}
          disabled
          className="w-full px-3 py-2 border border-gray-700 rounded bg-gray-900 text-gray-500"
        />
      </div>

      {Object.keys(props).map((key) => (
        <div key={key} className="space-y-1">
          <label className="block text-sm font-medium text-gray-400">
            {key}
          </label>
          {renderEditor(key, props[key])}
        </div>
      ))}
    </div>
  );
};

// Empty Canvas
const EmptyCanvas: React.FC<{
  onAddComponent: (type: string) => void;
  onDropNewComponentAtIndex: (index: number, type: string) => void;
}> = ({ onAddComponent, onDropNewComponentAtIndex }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [, drop] = useDrop(
    () => ({
      accept: "new-component",
      drop: (item: { componentType: string }) => {
        onDropNewComponentAtIndex(0, item.componentType);
      },
    }),
    [onDropNewComponentAtIndex],
  );

  drop(ref);
  return (
    <div
      ref={ref}
      className="flex flex-col items-center justify-center h-full min-h-[400px]"
    >
      <div className="text-center">
        <Plus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Start Building Your Page
        </h3>
        <p className="text-gray-500 mb-6">
          Drag and drop components from the sidebar or click below to get
          started
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => onAddComponent(COMPONENT_TYPES.HEADER)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Header
          </button>
          <button
            onClick={() => onAddComponent(COMPONENT_TYPES.HERO)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Add Hero Section
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function to get default props for each component type
const getDefaultProps = (type: string): any => {
  switch (type) {
    case COMPONENT_TYPES.HEADER:
      return {
        logoText: "Your Brand",
        menuItems: [
          { label: "Home", href: "#home" },
          { label: "Features", href: "#features" },
          { label: "Pricing", href: "#pricing" },
          { label: "Contact", href: "#contact" },
        ],
        ctaButton: { label: "Get Started", href: "#get-started" },
      };
    case COMPONENT_TYPES.HERO:
      return {
        title: "Welcome to Our Platform",
        subtitle: "Build amazing landing pages in minutes",
        buttonText: "Get Started",
        buttonUrl: "#",
      };
    case COMPONENT_TYPES.TEXT:
      return {
        content: "Enter your text here...",
        fontSize: "16px",
        textAlign: "left",
      };
    case COMPONENT_TYPES.BUTTON:
      return {
        text: "Click Me",
        url: "#",
        style: "primary",
        size: "medium",
      };
    case COMPONENT_TYPES.SPACER:
      return { height: 50 };
    case COMPONENT_TYPES.DIVIDER:
      return { style: "solid", color: "#e5e7eb" };
    case COMPONENT_TYPES.TESTIMONIALS:
      return {
        title: "What our customers say",
        subtitle: "Real stories from real users",
        testimonials: [
          {
            name: "Alex Johnson",
            role: "Founder, Acme Inc.",
            quote: "This product transformed our marketing!",
          },
          {
            name: "Maria Garcia",
            role: "Head of Growth",
            quote: "Incredibly easy to use and very effective.",
          },
          {
            name: "Sam Patel",
            role: "Entrepreneur",
            quote: "Best landing page builder I have tried.",
          },
        ],
        columns: 3,
      };
    case COMPONENT_TYPES.PRICING:
      return {
        title: "Simple, transparent pricing",
        subtitle: "Choose the plan that fits your needs",
        plans: [
          {
            name: "Starter",
            price: "$19",
            period: "/mo",
            features: ["Basic builder", "Email support"],
            ctaText: "Get Starter",
            ctaUrl: "#",
            highlighted: false,
          },
          {
            name: "Pro",
            price: "$49",
            period: "/mo",
            features: ["All Starter features", "AI import", "Custom domains"],
            ctaText: "Get Pro",
            ctaUrl: "#",
            highlighted: true,
          },
          {
            name: "Business",
            price: "$99",
            period: "/mo",
            features: [
              "Everything in Pro",
              "Team collaboration",
              "Priority support",
            ],
            ctaText: "Get Business",
            ctaUrl: "#",
            highlighted: false,
          },
        ],
      };
    case COMPONENT_TYPES.FAQ:
      return {
        title: "Frequently Asked Questions",
        items: [
          {
            question: "How does the builder work?",
            answer:
              "Drag and drop components to build your page, then customize in the Properties panel.",
          },
          {
            question: "Can I import an existing page?",
            answer:
              "Yes, use the Import from URL option to generate a template from any website.",
          },
          {
            question: "Is there a free trial?",
            answer: "You can start for free and upgrade anytime.",
          },
        ],
      };
    case COMPONENT_TYPES.VIDEO:
      return { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" };
    case COMPONENT_TYPES.COUNTDOWN:
      return {
        targetDate: new Date(
          Date.now() + 1000 * 60 * 60 * 24 * 7,
        ).toISOString(),
        showLabels: true,
      };
    case COMPONENT_TYPES.SOCIAL:
      return {
        links: [
          { platform: "twitter", url: "#" },
          { platform: "facebook", url: "#" },
          { platform: "instagram", url: "#" },
          { platform: "linkedin", url: "#" },
        ],
      };
    case COMPONENT_TYPES.HTML:
      return {
        html: '<div style="padding:16px;border:1px dashed #d1d5db;border-radius:8px;background:#fafafa">Custom HTML block</div>',
      };
    case COMPONENT_TYPES.FOOTER:
      return {
        text: "© Your Company",
        links: [
          { label: "Privacy", url: "#" },
          { label: "Terms", url: "#" },
          { label: "Contact", url: "#" },
        ],
      };
    case COMPONENT_TYPES.COLUMNS:
      return {
        columns: 3,
        items: [
          { title: "Column 1", content: "Add your content" },
          { title: "Column 2", content: "Add your content" },
          { title: "Column 3", content: "Add your content" },
        ],
      };
    default:
      return {};
  }
};

export default PageBuilder;
