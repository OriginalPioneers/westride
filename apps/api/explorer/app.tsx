import { AppShell } from "@astryxdesign/core/AppShell";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import {
  SideNav,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
} from "@astryxdesign/core/SideNav";
import { Spinner } from "@astryxdesign/core/Spinner";
import { VStack } from "@astryxdesign/core/Stack";
import { Theme } from "@astryxdesign/core/theme";
import { stoneTheme } from "@astryxdesign/theme-stone/built";
import {
  CodeBracketSquareIcon,
  DocumentTextIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";
import { HomeIcon as HomeIconSolid } from "@heroicons/react/24/solid";
import {
  operationHref,
  overviewHref,
  useOpenApiDocument,
  useRoute,
  type DocumentState,
  type Route,
} from "./hooks";
import { groupOperations, listOperations } from "./openapi";
import { OperationPage } from "./operation-page";
import { OverviewPage } from "./overview-page";

const SPEC_PATH = "/openapi.json";
const WEBSITE_API_PAGE = "https://westride.org/api";

function ExplorerNav({ state, route }: { state: DocumentState; route: Route }) {
  const groups = state.status === "ready" ? groupOperations(state.doc) : [];

  return (
    <SideNav
      resizable={{
        defaultWidth: 280,
        minWidth: 220,
        maxWidth: 400,
        autoSaveId: "westride-api-explorer-nav",
      }}
      header={
        <SideNavHeading
          heading="WeStride API"
          subheading="Reference"
          headingHref={overviewHref}
        />
      }
      footer={
        <SideNavSection title="Resources" isHeaderHidden>
          <SideNavItem
            label="OpenAPI spec"
            href={SPEC_PATH}
            icon={CodeBracketSquareIcon}
          />
          <SideNavItem
            label="About the API"
            href={WEBSITE_API_PAGE}
            icon={DocumentTextIcon}
          />
        </SideNavSection>
      }
    >
      <SideNavSection title="Introduction" isHeaderHidden>
        <SideNavItem
          label="Overview"
          href={overviewHref}
          icon={HomeIcon}
          selectedIcon={HomeIconSolid}
          isSelected={route.page === "overview"}
        />
      </SideNavSection>
      {groups.map((group) => (
        <SideNavSection key={group.tag} title={group.tag}>
          {group.operations.map((operation) => (
            <SideNavItem
              key={operation.id}
              label={operation.summary ?? `${operation.method} ${operation.path}`}
              href={operationHref(operation.id)}
              isSelected={route.page === "operation" && route.id === operation.id}
            />
          ))}
        </SideNavSection>
      ))}
    </SideNav>
  );
}

function MessagePage({ children }: { children: React.ReactNode }) {
  return (
    <Layout
      content={
        <LayoutContent>
          <VStack height="100%" hAlign="center" vAlign="center">
            {children}
          </VStack>
        </LayoutContent>
      }
    />
  );
}

function ExplorerContent({ state, route }: { state: DocumentState; route: Route }) {
  if (state.status === "loading") {
    return (
      <MessagePage>
        <Spinner size="lg" label="Loading the API spec" />
      </MessagePage>
    );
  }

  if (state.status === "error") {
    return (
      <MessagePage>
        <EmptyState
          title="Couldn't load the API spec"
          description={`${state.message} Refresh the page to try again.`}
          headingLevel={1}
        />
      </MessagePage>
    );
  }

  if (route.page === "operation") {
    const operation = listOperations(state.doc).find((op) => op.id === route.id);
    if (operation) {
      return <OperationPage key={operation.id} doc={state.doc} operation={operation} />;
    }
    return (
      <MessagePage>
        <EmptyState
          title="Endpoint not found"
          description={`No operation is named "${route.id}". Pick an endpoint from the menu.`}
          headingLevel={1}
        />
      </MessagePage>
    );
  }

  return <OverviewPage doc={state.doc} specPath={SPEC_PATH} />;
}

export function App() {
  const state = useOpenApiDocument(SPEC_PATH);
  const route = useRoute();

  return (
    <Theme theme={stoneTheme}>
      <AppShell variant="section" sideNav={<ExplorerNav state={state} route={route} />}>
        <ExplorerContent state={state} route={route} />
      </AppShell>
    </Theme>
  );
}
