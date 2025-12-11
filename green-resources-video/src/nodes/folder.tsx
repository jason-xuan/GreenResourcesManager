import {Rect, RectProps, Layout} from '@motion-canvas/2d';
import {createRef} from '@motion-canvas/core';

export interface FolderProps extends RectProps {
  folderColor?: string;
  tabColor?: string;
  tabWidth?: number;
  tabHeight?: number;
}

export function Folder({
  children,
  folderColor = '#FFD700',
  tabColor = '#DAA520',
  tabWidth = 60,
  tabHeight = 20,
  width = 120,
  height = 160,
  ...props
}: FolderProps) {
  const folderBodyRef = createRef<Rect>();
  const folderTabRef = createRef<Rect>();
  const innerDocRef = createRef<Rect>();

  const folder = (
    <Layout layout={false} {...props} cache>
      {/* 文件夹主体 */}
      <Rect
        ref={folderBodyRef}
        fill={folderColor}
        radius={4}
        layout={false}
        width={width}
        height={height}
        position={() => {
          const h = folderBodyRef().height();
          return [0, h * 0.05];
        }}
      />
      
      {/* 文件夹标签页（左上角） */}
      <Rect
        ref={folderTabRef}
        fill={tabColor}
        radius={[4, 4, 0, 0]}
        layout={false}
        width={tabWidth}
        height={tabHeight}
        position={() => {
          const bodySize = folderBodyRef().size();
          return [
            -bodySize.width / 2 + tabWidth / 2,
            -bodySize.height / 2 - tabHeight /  + bodySize.height * 0.05
          ];
        }}
      />
      
      {/* 内部文档（白色矩形，表示文件夹里有文件） */}
      <Rect
        ref={innerDocRef}
        fill="#ffffff"
        radius={[2, 2, 0, 0]}
        layout={false}
        width={() => {
          const bodySize = folderBodyRef().size();
          return bodySize.width * 0.85;
        }}
        height={() => {
          const bodySize = folderBodyRef().size();
          return bodySize.height * 0.6;
        }}
        position={() => {
          const bodySize = folderBodyRef().size();
          return [0, bodySize.height * 0.2];
        }}
      />
      
      {/* 内容区域（用于放置 children） */}
      <Layout
        layout
        direction="column"
        alignItems="center"
        justifyContent="center"
        width={width}
        height={height}
        position={() => {
          const bodySize = folderBodyRef().size();
          return [0, bodySize.height * 0.05];
        }}
      >
        {children}
      </Layout>
    </Layout>
  ) as Layout;

  return folder;
}

