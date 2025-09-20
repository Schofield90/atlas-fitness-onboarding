/**
 * @deprecated This component is deprecated and no longer maintained.
 * Please use the main WorkflowBuilder component at ./WorkflowBuilder.tsx instead.
 * This file is kept for backward compatibility but will be removed in future versions.
 *
 * Migration: Replace all imports of ResponsiveWorkflowBuilder with WorkflowBuilder
 */

"use client";

import { useState, useEffect } from "react";
import {
  Menu,
  X,
  Maximize2,
  Minimize2,
  Smartphone,
  Tablet,
  Monitor,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  MoreHorizontal,
} from "lucide-react";
import EnhancedWorkflowBuilderV2 from "./EnhancedWorkflowBuilderV2";
import { useMediaQuery } from "@/app/hooks/useMediaQuery";

interface ResponsiveWorkflowBuilderProps {
  organizationId: string;
  workflowId?: string;
  onSave?: (workflow: any) => void;
  initialWorkflow?: any;
  className?: string;
}

// Custom hook for media queries
const useBreakpoint = () => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");
  const isDesktop = useMediaQuery("(min-width: 1025px)");

  return {
    isMobile,
    isTablet,
    isDesktop,
    breakpoint: isMobile ? "mobile" : isTablet ? "tablet" : "desktop",
  };
};

// Mobile-optimized toolbar
const MobileToolbar = ({
  onMenuToggle,
  onSave,
  onTemplates,
  workflowName,
  onNameChange,
  isValid,
}: {
  onMenuToggle: () => void;
  onSave: () => void;
  onTemplates: () => void;
  workflowName: string;
  onNameChange: (name: string) => void;
  isValid: boolean;
}) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="bg-white border-b border-gray-200 p-3 sticky top-0 z-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={onMenuToggle}
            className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={workflowName}
            onChange={(e) => onNameChange(e.target.value)}
            className="text-lg font-semibold bg-transparent border-none focus:outline-none max-w-48"
            placeholder="Workflow Name"
          />
        </div>

        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${isValid ? "bg-green-500" : "bg-red-500"}`}
          ></div>
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showActions && (
        <div className="absolute right-3 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-40 z-30">
          <button
            onClick={onSave}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
          >
            Save Workflow
          </button>
          <button
            onClick={onTemplates}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
          >
            Browse Templates
          </button>
          <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center">
            Export
          </button>
        </div>
      )}
    </div>
  );
};

// Mobile-optimized side drawer
const MobileSideDrawer = ({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  useEffect(() => {
    if (typeof document !== "undefined") {
      if (isOpen) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "unset";
      }

      return () => {
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed left-0 top-0 h-full w-80 max-w-[90vw] bg-white transform transition-transform duration-300 z-50 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Workflow Tools</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="h-full overflow-y-auto pb-20">{children}</div>
      </div>
    </>
  );
};

// Tablet-optimized bottom panel
const TabletBottomPanel = ({
  isOpen,
  onToggle,
  children,
}: {
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => {
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 transform transition-transform duration-300 z-30 ${
        isOpen ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ height: isOpen ? "40vh" : "auto" }}
    >
      <div className="p-3 border-b border-gray-200">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center space-x-2 text-sm font-medium text-gray-700"
        >
          <span>Workflow Tools</span>
          {isOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </button>
      </div>
      {isOpen && <div className="h-full overflow-y-auto pb-16">{children}</div>}
    </div>
  );
};

// Responsive viewport indicator
const ViewportIndicator = ({ breakpoint }: { breakpoint: string }) => {
  const getIcon = () => {
    switch (breakpoint) {
      case "mobile":
        return <Smartphone className="w-4 h-4" />;
      case "tablet":
        return <Tablet className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg flex items-center space-x-2 text-xs z-50 lg:hidden">
      {getIcon()}
      <span className="capitalize">{breakpoint}</span>
    </div>
  );
};

// Mobile-friendly canvas controls
const MobileCanvasControls = ({
  onFitView,
  onZoomIn,
  onZoomOut,
  showMinimap,
  onToggleMinimap,
}: {
  onFitView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  showMinimap: boolean;
  onToggleMinimap: () => void;
}) => {
  return (
    <div className="fixed bottom-4 left-4 flex flex-col space-y-2 z-20">
      <button
        onClick={onFitView}
        className="p-3 bg-white border border-gray-200 rounded-lg shadow-lg hover:bg-gray-50"
        title="Fit to view"
      >
        <Maximize2 className="w-5 h-5" />
      </button>
      <button
        onClick={onZoomIn}
        className="p-3 bg-white border border-gray-200 rounded-lg shadow-lg hover:bg-gray-50"
        title="Zoom in"
      >
        <span className="text-lg font-bold">+</span>
      </button>
      <button
        onClick={onZoomOut}
        className="p-3 bg-white border border-gray-200 rounded-lg shadow-lg hover:bg-gray-50"
        title="Zoom out"
      >
        <span className="text-lg font-bold">−</span>
      </button>
      <button
        onClick={onToggleMinimap}
        className={`p-3 border border-gray-200 rounded-lg shadow-lg ${
          showMinimap
            ? "bg-blue-100 text-blue-600"
            : "bg-white hover:bg-gray-50"
        }`}
        title={showMinimap ? "Hide minimap" : "Show minimap"}
      >
        {showMinimap ? (
          <EyeOff className="w-5 h-5" />
        ) : (
          <Eye className="w-5 h-5" />
        )}
      </button>
    </div>
  );
};

export default function ResponsiveWorkflowBuilder(
  props: ResponsiveWorkflowBuilderProps,
) {
  const { isMobile, isTablet, isDesktop, breakpoint } = useBreakpoint();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showTabletPanel, setShowTabletPanel] = useState(false);
  const [workflowName, setWorkflowName] = useState(
    props.initialWorkflow?.name || "New Workflow",
  );
  const [showMinimap, setShowMinimap] = useState(!isMobile);

  // Auto-hide minimap on mobile
  useEffect(() => {
    setShowMinimap(!isMobile);
  }, [isMobile]);

  // Desktop version - use the full builder
  if (isDesktop) {
    return (
      <div className="h-full">
        <EnhancedWorkflowBuilderV2 {...props} />
        <ViewportIndicator breakpoint={breakpoint} />
      </div>
    );
  }

  // Mobile version
  if (isMobile) {
    return (
      <div className="h-full flex flex-col">
        <MobileToolbar
          onMenuToggle={() => setShowMobileSidebar(true)}
          onSave={() => console.log("Save workflow")}
          onTemplates={() => console.log("Show templates")}
          workflowName={workflowName}
          onNameChange={setWorkflowName}
          isValid={true}
        />

        <div className="flex-1 relative">
          {/* Main canvas - simplified for mobile */}
          <div className="h-full bg-gray-50 relative overflow-hidden">
            <EnhancedWorkflowBuilderV2 {...props} className="h-full" />
          </div>

          {/* Mobile canvas controls */}
          <MobileCanvasControls
            onFitView={() => console.log("Fit view")}
            onZoomIn={() => console.log("Zoom in")}
            onZoomOut={() => console.log("Zoom out")}
            showMinimap={showMinimap}
            onToggleMinimap={() => setShowMinimap(!showMinimap)}
          />
        </div>

        {/* Mobile side drawer */}
        <MobileSideDrawer
          isOpen={showMobileSidebar}
          onClose={() => setShowMobileSidebar(false)}
        >
          <div className="p-4">
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Node Palette</h4>
              <div className="text-sm text-gray-600 mb-4">
                Tap and hold to add nodes to your workflow
              </div>
              {/* Simplified node palette for mobile */}
              <div className="space-y-3">
                {[
                  {
                    name: "New Lead Trigger",
                    type: "trigger",
                    color: "orange",
                  },
                  { name: "Send Email", type: "action", color: "blue" },
                  { name: "Send SMS", type: "action", color: "green" },
                  { name: "Wait/Delay", type: "wait", color: "purple" },
                  {
                    name: "If/Then Condition",
                    type: "condition",
                    color: "indigo",
                  },
                ].map((node) => (
                  <div
                    key={node.name}
                    className={`p-3 border rounded-lg bg-${node.color}-50 border-${node.color}-200 cursor-pointer active:scale-95 transition-transform`}
                  >
                    <div className="font-medium text-gray-900">{node.name}</div>
                    <div className="text-xs text-gray-600 capitalize">
                      {node.type} node
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Quick Actions</h4>
              <div className="space-y-2">
                <button className="w-full p-3 text-left bg-gray-100 rounded-lg hover:bg-gray-200">
                  Browse Templates
                </button>
                <button className="w-full p-3 text-left bg-gray-100 rounded-lg hover:bg-gray-200">
                  Import Workflow
                </button>
                <button className="w-full p-3 text-left bg-gray-100 rounded-lg hover:bg-gray-200">
                  Workflow Settings
                </button>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Validation</h4>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-green-700">
                    Workflow is valid
                  </span>
                </div>
              </div>
            </div>
          </div>
        </MobileSideDrawer>

        <ViewportIndicator breakpoint={breakpoint} />
      </div>
    );
  }

  // Tablet version
  return (
    <div className="h-full flex flex-col">
      {/* Tablet toolbar */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="text-lg font-semibold bg-transparent border-none focus:outline-none"
            placeholder="Workflow Name"
          />
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Valid</span>
            </div>
            <button
              onClick={() => setShowTabletPanel(!showTabletPanel)}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
            >
              Tools
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Save
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <EnhancedWorkflowBuilderV2 {...props} className="h-full" />

        {/* Tablet bottom panel */}
        <TabletBottomPanel
          isOpen={showTabletPanel}
          onToggle={() => setShowTabletPanel(!showTabletPanel)}
        >
          <div className="p-4 grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                Quick Add Nodes
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: "Trigger", color: "orange" },
                  { name: "Email", color: "blue" },
                  { name: "SMS", color: "green" },
                  { name: "Wait", color: "purple" },
                  { name: "Condition", color: "indigo" },
                  { name: "WhatsApp", color: "teal" },
                ].map((node) => (
                  <button
                    key={node.name}
                    className={`p-2 text-sm bg-${node.color}-100 text-${node.color}-700 rounded-lg hover:bg-${node.color}-200`}
                  >
                    {node.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Workflow Tools</h4>
              <div className="space-y-2">
                <button className="w-full p-2 text-sm text-left bg-gray-100 rounded-lg hover:bg-gray-200">
                  Browse Templates
                </button>
                <button className="w-full p-2 text-sm text-left bg-gray-100 rounded-lg hover:bg-gray-200">
                  Validation Report
                </button>
                <button className="w-full p-2 text-sm text-left bg-gray-100 rounded-lg hover:bg-gray-200">
                  Export Workflow
                </button>
              </div>
            </div>
          </div>
        </TabletBottomPanel>
      </div>

      <ViewportIndicator breakpoint={breakpoint} />
    </div>
  );
}
