const { waitForSelectors, scrollIntoViewIfNeeded } = require("../helpers.js");

module.exports = async (page) => {
  const timeout = 5000;
  page.setDefaultTimeout(timeout);

  {
    const targetPage = page;
    await scrollIntoViewIfNeeded(
      [
        ["div.o_EditorGrid_EditorGrid_zeroStateTopArea a"],
        ["text/Refresh Now"],
      ],
      targetPage,
      timeout
    );
    const element = await waitForSelectors(
      [
        ["div.o_EditorGrid_EditorGrid_zeroStateTopArea a"],
        ["text/Refresh Now"],
      ],
      targetPage,
      { timeout, visible: true }
    );
    await element.click({
      offset: {
        x: 70.125,
        y: 9,
      },
    });
  }
};
