import React from "react";
import {
  Editor as DraftJSEditor,
  EditorState,
  RichUtils,
  AtomicBlockUtils,
  DefaultDraftBlockRenderMap,
  CompositeDecorator,
} from "draft-js";
import "draft-js/dist/Draft.css";
import PropTypes from "prop-types";
import Media from "./Renderers/Media.js";
import Code from "./Renderers/Code.js";
import { Map } from "immutable";
import YouTube from "./Decorators/YouTube.js";
import Text from "./Renderers/Text.js";
import Blockquote from "./Renderers/Blockquote.js";
import Link from "./Decorators/Link.js";
import Tweet from "./Decorators/Tweet.js";

const Editor = (props) => {
  const handleKeyCommand = (command, editorState) => {
    const newState = RichUtils.handleKeyCommand(editorState, command);

    if (newState) {
      props.onChange(newState);
      return "handled";
    }

    return "not-handled";
  };

  const handleTab = (event) => {
    event.preventDefault();
    props.onChange(RichUtils.onTab(event, props.editorState, 4));
  };

  const customBlockRenderer = (block) => {
    const blockType = block.getType();
    switch (blockType) {
      case "atomic":
        return {
          component: Media,
          editable: false,
          props: {
            styles: props.theme.media,
          },
        };
      default:
      // do nothing
    }
  };

  const blockRenderMap = Map({
    unstyled: {
      element: "span",
      wrapper: <Text style={props.theme.text} />,
    },
    blockquote: {
      element: "span",
      wrapper: <Blockquote style={props.theme.blockquote} />,
    },
    "code-block": {
      element: "span",
      wrapper: <Code style={props.theme.code} />,
    },
  });

  const extendedBlockRenderMap = DefaultDraftBlockRenderMap.merge(
    blockRenderMap
  );

  return (
    <DraftJSEditor
      editorKey="editor" // for data-editor invalid prop error
      editorState={props.editorState}
      onChange={props.onChange}
      readOnly={props.readOnly}
      handleKeyCommand={handleKeyCommand}
      blockRendererFn={customBlockRenderer}
      blockRenderMap={extendedBlockRenderMap}
      spellCheck={true}
      onTab={handleTab}
    />
  );
};

Editor.addImage = (editorState, url) => {
  const contentState = editorState.getCurrentContent();
  const contentStateWithEntity = contentState.createEntity(
    Media.IMAGE_TYPE,
    "IMMUTABLE",
    { options: { url } }
  );
  const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
  const newEditorState = EditorState.set(editorState, {
    currentContent: contentStateWithEntity,
  });
  return AtomicBlockUtils.insertAtomicBlock(newEditorState, entityKey, " ");
};

Editor.toggleCode = (editorState) => RichUtils.toggleCode(editorState);
Editor.toggleLink = (editorState) =>
  RichUtils.toggleLink(editorState, editorState.getSelection(), null);
Editor.toggleBlockquote = (editorState) =>
  RichUtils.toggleBlockType(editorState, "blockquote");
Editor.toggleBold = (editorState) =>
  RichUtils.toggleInlineStyle(editorState, "BOLD");
Editor.toggleItalic = (editorState) =>
  RichUtils.toggleInlineStyle(editorState, "ITALIC");
Editor.toggleHeading = (editorState) =>
  RichUtils.toggleBlockType(editorState, "header-one");
Editor.toggleSubHeading = (editorState) =>
  RichUtils.toggleBlockType(editorState, "header-two");
Editor.toggleUnorderedListItem = (editorState) =>
  RichUtils.toggleBlockType(editorState, "unordered-list-item");
Editor.toggleOrderedListItem = (editorState) =>
  RichUtils.toggleBlockType(editorState, "ordered-list-item");

Editor.getDecorators = () => {
  // From https://draftjs.org/docs/advanced-topics-decorators
  const findWithRegex = (regex, contentBlock, callback) => {
    const text = contentBlock.getText();
    let matchArr, start;
    while ((matchArr = regex.exec(text)) !== null) {
      start = matchArr.index;
      callback(start, start + matchArr[0].length);
    }
  };

  const videoStrategy = (contentBlock, callback, contentState) => {
    const YOUTUBE_REGEX = /http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?‌​[\w\?‌​=]*)?/g; // eslint-disable-line
    findWithRegex(YOUTUBE_REGEX, contentBlock, callback);
  };

  const linkStrategy = (contentBlock, callback, contentState) => {
    // Regex from Stackoverflow: https://stackoverflow.com/a/3809435/942589
    const LINK_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)?/gi;
    findWithRegex(LINK_REGEX, contentBlock, callback);
  };

  const twitterStrategy = (contentBlock, callback, contentState) => {
    const TWITTER_REGEX = /https?:\/\/twitter\.com\/(?:#!\/)?(\w+)\/status(es)?\/(\d+)/g;
    findWithRegex(TWITTER_REGEX, contentBlock, callback);
  };

  return new CompositeDecorator([
    {
      strategy: videoStrategy,
      component: YouTube,
    },
    {
      strategy: twitterStrategy,
      component: Tweet,
    },
    {
      strategy: linkStrategy,
      component: Link,
    },
  ]);
};

Editor.propTypes = {
  editorState: PropTypes.object,
  onChange: PropTypes.func,
  readOnly: PropTypes.bool,
  theme: PropTypes.object,
};

export default Editor;
