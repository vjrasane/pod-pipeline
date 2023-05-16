const { waitForSelectors, scrollIntoViewIfNeeded } = require("../helpers.js");

module.exports = async (page) => {
  const timeout = 5000;
  page.setDefaultTimeout(timeout);

  {
    const targetPage = page;
    await scrollIntoViewIfNeeded(
      [['aria/Delete[role="button"]']],
      targetPage,
      timeout
    );
    const element = await waitForSelectors(
      [['aria/Delete[role="button"]']],
      targetPage,
      { timeout, visible: true }
    );
    await element.click({
      offset: {
        x: 218.5,
        y: 30,
      },
    });
  }
};
