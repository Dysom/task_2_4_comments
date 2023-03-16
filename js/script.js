'use strict';

console.clear();

const pageSettings = initSettings();

const formErrors = new Map();

formErrors.set('name-empty', 'Поле \'Имя\' не может быть пустым');
formErrors.set('text-empty', 'Поле \'Текст\' не может быть пустым');
formErrors.set('date-future', 'Поле \'Дата\' не должно указывать будущую дату');
formErrors.set('date-bad', 'Поле \'Дата\' неверно задано');

const commentForm = document.querySelector('#add-comment-form');
const commentNameInput = commentForm.elements.comment_name;
const commentTextInput = commentForm.elements.comment_text;
const commentDateInput = commentForm.elements.comment_date;

const commentsListElem = document.querySelector('#comments');
commentsListElem.innerHTML = '<div></div>';

const commentsListIsEmptyHTML = 'Список комментариев пуст...';

setInputDate(commentDateInput, new Date);

toggleCommentsList(commentsListElem, true);

commentForm.addEventListener('submit', (event) => {
    event.preventDefault();

    processCommentForm();
});

commentForm.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();

        processCommentForm();
    }
});

function setInputDate(inputElem, date = null) {
    if (!date) {
        date = new Date();
    }

    const fullYearStr = date.getFullYear().toString();
    const monthStr = (date.getMonth() + 1).toString().padStart(2, '0');
    const dayStr = (date.getDate()).toString().padStart(2, '0');

    if (inputElem.type === 'date') {
        inputElem.value = [fullYearStr, monthStr, dayStr].join('-');
    }
    else if (inputElem.type === 'text') {
        inputElem.value = [fullYearStr, monthStr, dayStr].join('.');
    }
}

function processCommentForm() {

    lockForm();

    funcsBlock:
    {
        let commentName = commentNameInput.value;

        if (processCondition(textInputIsEmpty(commentName), 'name-empty', commentNameInput)) {
            break funcsBlock;
        }

        let commentText = commentTextInput.value;

        if (processCondition(textInputIsEmpty(commentText), 'text-empty', commentTextInput)) {
            break funcsBlock;
        }

        let commentDate = parseDate(commentDateInput.value);

        let nowDate = new Date;

        if (processCondition(commentDate == null, 'date-bad', commentDateInput)) {
            break funcsBlock;
        }

        if (!pageSettings.allowFutureDate
            && processCondition(dateIsFuture(commentDate, nowDate), 'date-future', commentDateInput)) {
            break funcsBlock;
        }

        commentDate.setHours(nowDate.getHours());
        commentDate.setMinutes(nowDate.getMinutes());

        let commentElem = createComment(commentName, commentText, commentDate);

        if (isEmptyCommentsList(commentsListElem)) {
            toggleCommentsList(commentsListElem, false);
        }

        insertCommentToList(commentElem, commentsListElem);
    }

    unlockForm();
}

function lockForm() {
    setLockForm(true);
}

function unlockForm() {
    setLockForm(false);
}

function setLockForm(lock) {
    commentNameInput.disabled = commentTextInput.disabled = commentDateInput.disabled = lock;
}

function insertCommentToList(commentElem, commentsListElem) {
    const container = getCommentsImmediateContainerIfNeeded(commentsListElem);

    if (pageSettings.orderOfComments > 1) {
        const commentsArr = getCommentsArray(container);

        const insertedTimestamp = getTimestampFromElem(commentElem);

        if (commentsArr.length > 0) {

            if (pageSettings.orderOfComments === 2) {
                for (const currCommentElem of commentsArr) {
                    if (insertedTimestamp > getTimestampFromElem(currCommentElem)) {
                        currCommentElem.before(commentElem);

                        return;
                    }
                }
            }
            else {
                for (const currCommentElem of commentsArr) {
                    if (insertedTimestamp < getTimestampFromElem(currCommentElem)) {
                        currCommentElem.before(commentElem);

                        return;
                    }
                }
            }
        }
    }

    if (pageSettings.orderOfComments === 1) {
        container.prepend(commentElem);

        return;
    }

    container.append(commentElem);
}

function parseDate(dateStr) {
    let arr = dateStr.split('-');

    if (!arr.length) {
        arr = dateStr.split('.');
    }

    if (arr.length === 3) {

        for (let i = 0; i < arr.length; i++) {
            arr[i] = +arr[i];
            if (isNaN(arr[i])) {
                return null;
            }
        }

        const fullYear = arr[0];
        const month = arr[1] - 1;
        const day = arr[2];

        if (month < 0 || month > 11) {
            return null;
        }

        if (day < 1 || day > new Date(fullYear, month + 1, 0).getDate()) {
            return null;
        }

        const outDate = new Date(0, month, day)

        outDate.setFullYear(fullYear);

        return outDate;
    }

    return null;
}

function dateIsFuture(date, nowDate) {
    if (!nowDate) {
        nowDate = new Date;
    }

    return nowDate - date < 0;
}

function textInputIsEmpty(textValue) {
    return textValue.trim() === '';
}

function processCondition(condition, errorCode, inputElem, focusDelay = 0) {
    if (condition) {
        const notify = showNotify(inputElem, formErrors.has(errorCode) ? formErrors.get(errorCode) : 'Ошибка!');
        inputElem.addEventListener(inputIsTyping(inputElem) ? 'input' : 'change', () => {
            notify.remove();
        }, { once: true });

        if (focusDelay == null) {
            inputElem.focus();
        }
        else {
            setTimeout(() => inputElem.focus(), focusDelay);
        }

        return true;
    }

    return false;
}

function inputIsTyping(inputElem) {
    return inputElem.type === 'text' ||
        inputElem.tagName.toLowerCase() === 'textarea';
}

function showNotify(elem, htmlText) {
    const notify = document.createElement('div');
    notify.style.position = 'absolute';
    notify.className = 'field-error-notify';
    notify.innerHTML = htmlText;

    const coordsBox = getCoordsBox(elem);
    notify.style.left = coordsBox.left + 'px';
    notify.style.top = coordsBox.bottom + 5 + 'px';

    document.body.append(notify);

    return notify;
}

function getCoordsBox(elem) {
    const elemRect = elem.getBoundingClientRect();

    return {
        left: elemRect.left + window.pageXOffset,
        top: elemRect.top + window.pageYOffset,
        right: elemRect.right + window.pageXOffset,
        bottom: elemRect.bottom + window.pageYOffset
    }
}

function createComment(commentName, commentText, commentDate, nowDate = null) {
    if (!nowDate) {
        nowDate = new Date;
    }

    const commentElem = document.createElement('div');

    commentElem.classList.add('comments__item', 'comment-item');

    setTimestampToElem(commentElem, commentDate.getTime());

    let commentDateStr = dateToCommentFormatString(commentDate, nowDate);

    commentElem.innerHTML = `<h3 class="comment-item__name">${commentName}</h3>
<div class="comment-item__content">${commentText}</div>
<div class="comment-item__line">
    <span class="comment-item__date">${commentDateStr}</span>
    <span class="comment-item__like">
        <span class="comment-item__add-like">
            <img class="comment-item__add-like-img" src="img/heart-svgrepo-com.svg" width="24"
                 height="24"
                 alt="like" />
        </span>
        <span hidden class="comment-item__like-text">+ LIKE</span>
    </span>
    <span class="comment-item__trash">
        <img class="comment-item__trash-img" src="img/trash-1-svgrepo-com.svg" width="24"
            height="24"
            alt="trash" />
    </span>
</div>` +
        (pageSettings.showAddonCloseButton ?
            `<div class="comment-item__close">
    <img src="img/cancel-close-svgrepo-com.svg" width="24" height="24" alt="close" />
</div>` : '');

    const addLikeElem = commentElem.querySelector('.comment-item__add-like');

    addLikeElem.addEventListener('click', event => {
        const container = event.currentTarget.closest('.comment-item__line');

        if (container) {
            const toggledElem = container.querySelector('.comment-item__like-text');

            if (toggledElem) {
                toggledElem.hidden = !toggledElem.hidden;
            }
        }
    });

    const closeCommentElem = commentElem.querySelector('.comment-item__close');
    const altCloseCommentElem = commentElem.querySelector('.comment-item__trash');

    [closeCommentElem, altCloseCommentElem].forEach(elem => {
        if (!elem) {
            return;
        }

        elem.addEventListener('click', event => {
            const commentElem = event.currentTarget.closest('.comment-item');

            removeCommentFromList(commentElem, commentsListElem);
        });
    });

    return commentElem;
}

function setTimestampToElem(elem, timestamp) {
    elem.dataset.timestamp = timestamp;
}

function getTimestampFromElem(elem) {
    return Number.parseInt(elem.dataset.timestamp);
}

function dateToCommentFormatString(date, nowDate) {

    let dateStr = '';

    let yestodayDate = new Date(nowDate.getTime());
    yestodayDate.setDate(yestodayDate.getDate() - 1);

    if (datesAreEqual(date, nowDate)) {
        dateStr += 'сегодня';
    }
    else if (datesAreEqual(date, yestodayDate)) {
        dateStr += 'вчера';
    }
    else {
        dateStr += getDateStrFromDate(date);
    }

    dateStr += ', ';

    dateStr += getTimeStrFromDate(date);

    return dateStr;
}

function datesAreEqual(firstDate, secondDate) {
    return firstDate.getFullYear() === secondDate.getFullYear() &&
        firstDate.getMonth() === secondDate.getMonth() &&
        firstDate.getDate() === secondDate.getDate();
}

function getDateStrFromDate(date) {
    return [
        date.getDate().toString().padStart(2, '0'),
        (date.getMonth() + 1).toString().padStart(2, '0'),
        date.getFullYear().toString().padStart(4, '0')
    ].join('.');
}

function getTimeStrFromDate(date) {
    return date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
}

function removeCommentFromList(commentElem, commentsListElem) {
    commentElem.remove();

    if (isEmptyCommentsList(commentsListElem)) {
        toggleCommentsList(commentsListElem, true);
    }
}

function toggleCommentsList(commentsListElem, toEmpty) {
    const container = getCommentsImmediateContainerIfNeeded(commentsListElem);

    let [removedClass, addedClass] = ['comments__empty', 'comments__list'];

    if (toEmpty) {
        [removedClass, addedClass] = [addedClass, removedClass];

        container.innerHTML = commentsListIsEmptyHTML;
    }
    else {
        container.innerHTML = '';
    }

    if (container.classList.contains(removedClass)) {
        container.classList.remove(removedClass);
    }

    if (!container.classList.contains(addedClass)) {
        container.classList.add(addedClass);
    }
}

function isEmptyCommentsList(commentsListElem) {
    const container = getCommentsImmediateContainerIfNeeded(commentsListElem);

    return getCommentsArray(container).length <= 0;
}


function getCommentsArray(commentsContainer) {
    commentsContainer = getCommentsImmediateContainerIfNeeded(commentsContainer);

    return Array.from(commentsContainer.children).filter(elem => elem.classList.contains('comment-item'));
}

function getCommentsImmediateContainerIfNeeded(commentsContainer) {
    return commentsContainer.classList.contains('comments') ? commentsContainer.firstElementChild : commentsContainer;
}

function initSettings() {
    const initItems = [
        ['allowFutureDate', 'ALLOW_FUTURE_DATE', true],
        ['orderOfComments', 'ORDER_OF_COMMENTS', 0],
        ['showAddonCloseButton', 'SHOW_ADDON_CLOSE_BUTTON', true]
    ];

    const settings = {};

    for (const initItem of initItems) {

        try {
            settings[initItem[0]] = (new Function(`return ${initItem[1]};`))();

        } catch (error) {
            settings[initItem[0]] = settings[initItem[2]];
        }
    }

    return settings;
}
