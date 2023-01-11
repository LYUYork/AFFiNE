import { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { PropsWithChildren } from 'react';
import { getDataCenter } from '@affine/datacenter';
import {
  AppStateContext,
  AppStateFunction,
  AppStateValue,
  PageMeta,
} from './interface';
import { createDefaultWorkspace } from './utils';
import { WorkspaceUnit, User } from '@affine/datacenter';

type AppStateContextProps = PropsWithChildren<Record<string, unknown>>;

export const AppState = createContext<AppStateContext>({} as AppStateContext);

export const useAppState = () => useContext(AppState);

export const AppStateProvider = ({
  children,
}: PropsWithChildren<AppStateContextProps>) => {
  const [appState, setAppState] = useState<AppStateValue>({} as AppStateValue);

  useEffect(() => {
    const initState = async () => {
      const dataCenter = await getDataCenter();

      // Ensure datacenter has at least one workspace
      if (dataCenter.workspaces.length === 0) {
        await createDefaultWorkspace(dataCenter);
      }

      setAppState({
        dataCenter,
        user: (await dataCenter.getUserInfo()) || null,
        workspaceList: dataCenter.workspaces,
        currentWorkspaceId: '',
        currentWorkspace: null,
        pageList: [],
        currentPage: null,
        editor: null,
        synced: true,
        currentMetaWorkSpace: null,
      });
    };

    initState();
  }, []);

  useEffect(() => {
    if (!appState?.currentWorkspace?.blocksuiteWorkspace) {
      return;
    }
    const currentWorkspace = appState.currentWorkspace;
    const dispose = currentWorkspace?.blocksuiteWorkspace?.meta.pagesUpdated.on(
      () => {
        setAppState({
          ...appState,
          pageList: currentWorkspace.blocksuiteWorkspace?.meta
            .pageMetas as PageMeta[],
        });
      }
    ).dispose;
    return () => {
      dispose && dispose();
    };
  }, [appState]);

  useEffect(() => {
    const { dataCenter } = appState;
    // FIXME: onWorkspacesChange should have dispose function
    dataCenter?.onWorkspacesChange(
      () => {
        setAppState({
          ...appState,
          workspaceList: dataCenter.workspaces,
        });
      },
      { immediate: false }
    );
  }, [appState]);

  const loadPage = useRef<AppStateFunction['loadPage']>();
  loadPage.current = (pageId: string) => {
    const { currentWorkspace, currentPage } = appState;
    if (pageId === currentPage?.id) {
      return;
    }
    const page = currentWorkspace?.blocksuiteWorkspace?.getPage(pageId) || null;
    setAppState({
      ...appState,
      currentPage: page,
    });
  };

  const loadWorkspace = useRef<AppStateFunction['loadWorkspace']>();
  loadWorkspace.current = async (workspaceId: string) => {
    const { dataCenter, workspaceList, currentWorkspaceId, currentWorkspace } =
      appState;
    if (!workspaceList.find(v => v.id.toString() === workspaceId)) {
      return null;
    }
    if (workspaceId === currentWorkspaceId) {
      return currentWorkspace;
    }
    const workspace = await dataCenter.loadWorkspace(workspaceId);
    const currentMetaWorkSpace = dataCenter.workspaces.find(
      (item: WorkspaceUnit) => {
        return item.id.toString() === workspace.id;
      }
    );
    const pageList =
      (workspace?.blocksuiteWorkspace?.meta.pageMetas as PageMeta[]) ?? [];
    setAppState({
      ...appState,
      currentWorkspace: workspace,
      currentWorkspaceId: workspaceId,
      currentMetaWorkSpace: currentMetaWorkSpace ?? null,
      pageList: pageList,
      currentPage: null,
      editor: null,
    });

    return workspace;
  };

  const setEditor: AppStateFunction['setEditor'] =
    useRef() as AppStateFunction['setEditor'];
  setEditor.current = editor => {
    setAppState({
      ...appState,
      editor,
    });
  };

  const login = async () => {
    const { dataCenter } = appState;
    await dataCenter.login();
    const user = (await dataCenter.getUserInfo()) as User;
    setAppState({
      ...appState,
      user,
    });
    return user;
  };

  const logout = async () => {
    const { dataCenter } = appState;
    await dataCenter.logout();
    setAppState({
      ...appState,
      user: null,
    });
  };

  return (
    <AppState.Provider
      value={{
        ...appState,
        setEditor,
        loadPage: loadPage.current,
        loadWorkspace: loadWorkspace.current,
        login,
        logout,
      }}
    >
      {children}
    </AppState.Provider>
  );
};
