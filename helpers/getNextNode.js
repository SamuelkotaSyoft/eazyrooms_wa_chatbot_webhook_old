export default function getNextNode({
  currentNodeId,
  chatHistory,
  nodes,
  edges,
  phoneNumber,
}) {
  /**
   *
   * initialize nodeToSend to null
   */
  let nodeToSend = null;

  /**
   *
   *
   * if currentNode is undefined then return the first node
   *
   *  */
  if (!currentNodeId) {
    return nodes.filter(
      (node) =>
        node.id ===
        edges.filter((edge) => edge.source === nodes[0].id)[0]?.target
    )[0];
  }

  /**
   *
   *
   *
   *
   * if current node is a replyButtonsNode then get
   * the answer from the last message sent by the user
   * and get the next node to send based on the answer
   */
  if (
    nodes.filter((node) => node?.id === currentNodeId)[0]?.type ===
    "replyButtonsNode"
  ) {
    let replyButtonsAnswer = chatHistory?.messages?.filter(
      (message) => message.from === phoneNumber
    )[
      chatHistory?.messages?.filter((message) => message.from === phoneNumber)
        .length - 1
    ].message;


    /**
     *
     * figure which edge is connecting to the child node with the reply button answer
     */
    nodeToSend = nodes?.filter(
      (node) =>
        edges?.filter(
          (edge) =>
            edge?.source ===
            nodes?.filter(
              (node) =>
                node?.type === "replyButtonsChildNode" &&
                node?.data?.values?.buttonLabel === replyButtonsAnswer
            )[0]?.id
        )[0]?.target === node.id
    )[0];
  } else {
    let filteredEdges = edges.filter((edge) => edge.source === currentNodeId);

    let filteredNodes = nodes.filter(
      (node) => node.id === filteredEdges[0]?.target
    );

    nodeToSend = filteredNodes[0];
  }

  return nodeToSend;
}
