import * as chai from 'chai';
import 'jsdom-global/register';
import {spy} from 'sinon';

chai.config.truncateThreshold = 0;

import CollisionType  from '../Shared/Util/Constants/CollisionType';
import ICollisionData from '../Shared/Util/Interfaces/ICollisionData';

import BodyStatus     from './Constants/BodyStatus';
import ScrollStatus   from './Constants/ScrollStatus';
import IActions       from './Interfaces/IActions';
import resolveActions from './resolveActions';
import State          from './State';

const {assert} = chai;

const createMockState = () => new State({
    groups: [
        {
            options: [
                {
                    value: 'A'
                },
                {
                    value: 'B'
                },
                {
                    value: 'C'
                }
            ]
        }
    ]
});

interface ITestContext {
    state: State;
    actions: IActions;
}

const createOpenParams = (): [ICollisionData, () => boolean, number] => {
    return [
        {type: CollisionType.NONE, maxVisibleOptionsOverride: -1},
        () => false,
        0
    ];
};

describe('resolveActions', function(): void {
    // @ts-ignore
    const self: ITestContext = this;

    beforeEach(() => {
        self.state = createMockState();
        self.actions = resolveActions(self.state);

        self.actions.closeOthers = () => void 0;
        self.actions.scrollToView = () => void 0;
    });

    describe('.focus()', () => {
        it('sets `state.isFocused`', () => {
            self.actions.focus();

            assert.isTrue(self.state.isFocused);
        });
    });

    describe('.blur()', () => {
        it('unsets `state.isFocused`', () => {
            self.actions.focus();

            assert.isTrue(self.state.isFocused);

            self.actions.blur();

            assert.isFalse(self.state.isFocused);
        });
    });

    describe('.invalidate()', () => {
        it('sets `state.isInvalid`', () => {
            self.actions.invalidate();

            assert.isTrue(self.state.isInvalid);
        });
    });

    describe('.validate()', () => {
        it('unsets `state.isInvalid`', () => {
            self.actions.invalidate();

            assert.isTrue(self.state.isInvalid);

            self.actions.validate();

            assert.isFalse(self.state.isInvalid);
        });
    });

    describe('.topOut()', () => {
        it('sets the `state.scrollStatus` to `AT_TOP`', () => {
            self.state.scrollStatus = null;

            self.actions.topOut();

            assert.isTrue(self.state.isAtTop);
        });
    });

    describe('.bottomOut()', () => {
        it('sets the `state.scrollStatus` to `AT_BOTTOM`', () => {
            self.state.scrollStatus = null;

            self.actions.bottomOut();

            assert.isTrue(self.state.isAtBottom);
        });
    });

    describe('.scroll()', () => {
        it('sets the `state.scrollStatus` to `SCROLLED`', () => {
            self.state.scrollStatus = null;

            self.actions.scroll();

            assert.equal(self.state.scrollStatus, ScrollStatus.SCROLLED);
        });
    });

    describe('.makeScrollabel()', () => {
        it('sets `state.isScrollable`', () => {
            self.actions.makeScrollable();

            assert.isTrue(self.state.isScrollable);
        });
    });

    describe('.makeUnscrollable()', () => {
        it('unsets `state.isScrollable`', () => {
            self.actions.makeScrollable();

            assert.isTrue(self.state.isScrollable);

            self.actions.makeUnscrollable();

            assert.isFalse(self.state.isScrollable);
        });
    });

    describe('.setOptionHeight()', () => {
        it('sets `setOptionHeight` to the provided value', () => {
            self.actions.setOptionHeight(123);

            assert.equal(self.state.optionHeight, 123);
        });
    });

    describe('.open()', () => {
        it('does nothing if disabled', () => {
            self.state.isDisabled = true;

            self.actions.open.apply(self.actions, createOpenParams());

            assert.isTrue(self.state.isClosed);
        });

        it('calls `setOptionHeight()` and `closeOthers()` when opening', () => {
            const setOptionHeightSpy = spy(self.actions, 'setOptionHeight');
            const closeOthersSpy = spy(self.actions, 'closeOthers');

            self.actions.open.apply(self.actions, createOpenParams());

            assert.isTrue(setOptionHeightSpy.called);
            assert.isTrue(closeOthersSpy.called);
        });

        it('opens "below" if a collision type of `TOP` is provided', () => {
            const openParams = createOpenParams();

            openParams[0].type = CollisionType.TOP;

            self.actions.open.apply(self.actions, openParams);

            assert.isTrue(self.state.isOpenBelow);
        });

        it('opens "below" if a collision type of `NONE` is provided', () => {
            const openParams = createOpenParams();

            openParams[0].type = CollisionType.NONE;

            self.actions.open.apply(self.actions, openParams);

            assert.isTrue(self.state.isOpenBelow);
        });

        it('opens "above" if a collision type of `BOTTOM` is provided', () => {
            const openParams = createOpenParams();

            openParams[0].type = CollisionType.BOTTOM;

            self.actions.open.apply(self.actions, openParams);

            assert.isTrue(self.state.isOpenAbove);
        });

        it('calls `actions.makeScrollable()` if the second parameter returns `true`', async () => {
            const openParams = createOpenParams();
            const makeScrollableSpy = spy(self.actions, 'makeScrollable');

            openParams[1] = () => true;

            self.actions.open.apply(self.actions, openParams);

            await new Promise(resolver => setTimeout(resolver));

            assert.isTrue(makeScrollableSpy.called);
        });

        it(
            'calls `actions.makeUnscrollable()` if the second parameter returns ' +
            '`false`, and `state.isScrollable` is set',
            async () => {
                const openParams = createOpenParams();
                const makeUnscrollableSpy = spy(self.actions, 'makeUnscrollable');

                openParams[1] = () => false;

                self.state.isScrollable = true;

                self.actions.open.apply(self.actions, openParams);

                await new Promise(resolver => setTimeout(resolver));

                assert.isTrue(makeUnscrollableSpy.called);
            }
        );

        it(
            'calls `actions.scrollToView()`',
            async () => {
                const openParams = createOpenParams();
                const scrollToViewSpy = spy(self.actions, 'scrollToView');

                self.actions.open.apply(self.actions, openParams);

                await new Promise(resolver => setTimeout(resolver));

                assert.isTrue(scrollToViewSpy.called);
            }
        );
    });

    describe('.selectOption()', () => {
        it('sets `state.selectedIndex` to the provided index', () => {
            self.actions.selectOption(2);

            assert.equal(self.state.selectedIndex, 2);
        });

        it('revalidates the instance if `state.isInvalid` is `true`', () => {
            self.state.isInvalid = true;

            self.actions.selectOption(2);

            assert.isFalse(self.state.isInvalid);
        });

        it('closes the instance if open', () => {
            self.state.bodyStatus = BodyStatus.CLOSED;

            self.actions.selectOption(2);

            assert.isFalse(self.state.isOpen);
        });

        it('calls `actions.scrollToView` if searching', () => {
            const scrollToViewSpy = spy(self.actions, 'scrollToView');

            self.state.isSearching = true;

            self.actions.selectOption(2);

            assert.isTrue(scrollToViewSpy.called);
        });
    });

    describe('.useNative()', () => {
        it('sets `state.isUseNativeMode`', () => {
            self.actions.useNative();

            assert.isTrue(self.state.isUseNativeMode);
        });
    });
});