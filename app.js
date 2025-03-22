/**
 * بوصلة سوريا - Syria Compass
 * الملف الرئيسي للتطبيق
 */

document.addEventListener('DOMContentLoaded', function () {
    // تسجيل مكونات GSAP الإضافية
    gsap.registerPlugin(TextPlugin);
    // تهيئة المتغيرات
    let currentQuestionIndex = 0;
    let answers = {};

    // عناصر واجهة المستخدم
    const introSection = document.getElementById('intro');
    const questionContainer = document.getElementById('question-container');
    const resultsContainer = document.getElementById('results-container');
    const startButton = document.getElementById('start-btn');
    const prevButton = document.getElementById('prev-btn');
    const nextButton = document.getElementById('next-btn');
    const questionNumber = document.getElementById('question-number');
    const questionText = document.getElementById('question-text');
    const categoryLabel = document.getElementById('category');
    const progressBar = document.getElementById('progress-bar');
    const restartButton = document.getElementById('restart-btn');
    const shareButton = document.getElementById('share-btn');
    const answerButtons = document.querySelectorAll('.answer-btn');

    // عناصر المودال
    const questionsModal = document.getElementById('questions-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const closeModalButton = document.getElementById('close-modal');

    // الأحداث (Events)
    startButton.addEventListener('click', startTest);
    prevButton.addEventListener('click', showPreviousQuestion);
    nextButton.addEventListener('click', handleNextButtonClick);
    restartButton.addEventListener('click', restartTest);
    shareButton.addEventListener('click', shareResults);
    closeModalButton.addEventListener('click', closeModal);

    // إضافة مستمعي أحداث للمقاييس
    SCALES.forEach(scale => {
        const elementId = scale.id.replace(/_/g, '-');
        const scaleElement = document.getElementById(`scale-${elementId}`);
        const scaleContainer = scaleElement?.closest('.results-scale');

        if (scaleContainer) {
            scaleContainer.addEventListener('click', () => {
                showCategoryQuestions(scale.id);
            });
            // إضافة مؤشر للمستخدم أن المقياس قابل للنقر
            scaleContainer.classList.add('cursor-pointer');
        }
    });

    // إضافة مستمعي النقر لأزرار الإجابة
    answerButtons.forEach(button => {
        button.addEventListener('click', () => {
            selectAnswer(button.dataset.value);
        });
    });

    /**
     * بدء الاختبار
     */
    function startTest() {
        // انيميشن انتقال GSAP
        gsap.to(introSection, {
            opacity: 0,
            y: -20,
            duration: 0.3,
            onComplete: () => {
                introSection.classList.add('hidden');
                questionContainer.classList.remove('hidden');

                gsap.fromTo(questionContainer,
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.3 }
                );

                showQuestion(0);
            }
        });
    }

    /**
     * عرض السؤال بالمؤشر المعطى
     * @param {number} index - مؤشر السؤال
     */
    function showQuestion(index) {
        const question = QUESTIONS[index];
        questionText.textContent = question.text;
        questionNumber.textContent = `السؤال ${index + 1} من ${QUESTIONS.length}`;
        categoryLabel.textContent = question.categoryText;

        // تحديث زر العودة
        prevButton.disabled = index === 0;

        // تحديث نص زر التالي
        if (index === QUESTIONS.length - 1) {
            nextButton.textContent = "عرض النتائج";
        } else {
            nextButton.textContent = "التالي";
        }

        // تحديث شريط التقدم
        const progress = ((index + 1) / QUESTIONS.length) * 100;
        progressBar.style.width = `${progress}%`;

        // تحديد الإجابة المختارة إن وجدت
        answerButtons.forEach(button => {
            const value = button.dataset.value;
            if (answers[index] == value) {
                button.classList.add('selected');
            } else {
                button.classList.remove('selected');
            }
        });

        // تحديث المؤشر الحالي
        currentQuestionIndex = index;
    }

    /**
     * معالجة اختيار إجابة
     * @param {string} value - قيمة الإجابة
     */
    function selectAnswer(value) {
        answers[currentQuestionIndex] = parseInt(value);

        // تحديث مظهر الأزرار
        answerButtons.forEach(button => {
            if (button.dataset.value == value) {
                button.classList.add('selected');
            } else {
                button.classList.remove('selected');
            }
        });
    }

    /**
     * الانتقال للسؤال السابق
     */
    function showPreviousQuestion() {
        if (currentQuestionIndex > 0) {
            showQuestion(currentQuestionIndex - 1);
        }
    }

    /**
     * معالجة النقر على زر التالي
     */
    function handleNextButtonClick() {
        // إذا لم يكن المستخدم قد اختار إجابة، نطلب منه اختيار إجابة
        if (answers[currentQuestionIndex] === undefined) {
            alert('الرجاء اختيار إجابة قبل المتابعة');
            return;
        }

        // إذا كان هذا هو السؤال الأخير، نعرض النتائج
        if (currentQuestionIndex === QUESTIONS.length - 1) {
            showResults();
        } else {
            // وإلا ننتقل للسؤال التالي
            showQuestion(currentQuestionIndex + 1);
        }
    }

    /**
     * حساب النتائج وعرضها
     */
    function showResults() {
        // حساب النتائج
        const results = calculateResults();

        // تحديث الرسوم البيانية
        updateResultsVisuals(results);

        // إظهار قسم النتائج
        gsap.to(questionContainer, {
            opacity: 0,
            y: -20,
            duration: 0.3,
            onComplete: () => {
                questionContainer.classList.add('hidden');
                resultsContainer.classList.remove('hidden');

                gsap.fromTo(resultsContainer,
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.3 }
                );

                // إضافة انيميشن لكل مقياس
                animateResultScales(results);
            }
        });
    }

    /**
     * حساب النتائج بناءً على إجابات المستخدم
     * @returns {Object} - نتائج المستخدم لكل مقياس
     */
    function calculateResults() {
        // تهيئة النتائج
        let results = {};
        SCALES.forEach(scale => {
            results[scale.id] = 0;
        });

        // مجموع نقاط كل مقياس
        let totals = {};
        SCALES.forEach(scale => {
            totals[scale.id] = 0;
        });

        // حساب النتائج
        QUESTIONS.forEach((question, index) => {
            if (answers[index] !== undefined) {
                const answerValue = answers[index];
                const effectValue = question.effect;

                results[question.category] += answerValue * effectValue;
                totals[question.category]++;
            }
        });

        // تطبيع النتائج بين -1 و 1
        SCALES.forEach(scale => {
            // إذا كان هناك أسئلة من هذه الفئة تمت الإجابة عليها
            if (totals[scale.id] > 0) {
                const maxValue = totals[scale.id] * 2; // أقصى قيمة ممكنة (كل سؤال له قيمة 2)
                results[scale.id] = results[scale.id] / maxValue;
            }
        });

        return results;
    }

    /**
     * تحديث العناصر المرئية للنتائج
     * @param {Object} results - نتائج المستخدم
     */
    function updateResultsVisuals(results) {
        SCALES.forEach(scale => {
            // تحويل الشرطة السفلية إلى شرطة عادية في المعرّف
            const elementId = scale.id.replace(/_/g, '-');
            const marker = document.getElementById(`marker-${elementId}`);
            const scaleFill = document.getElementById(`scale-${elementId}`);
            const percentageEl = document.getElementById(`percentage-${elementId}`);
            const ratingEl = document.getElementById(`rating-${elementId}`);

            if (marker && scaleFill) {
                // قيمة من -1 إلى 1
                const value = results[scale.id];

                // تحويل القيمة إلى نسبة مئوية (0% إلى 100%)
                // حيث -1 = 0%، 0 = 50%، 1 = 100%
                const percentage = ((value + 1) / 2) * 100;

                // تحديث موقع المؤشر
                marker.style.left = `${percentage}%`;

                // تحديث حجم خلفية المقياس
                scaleFill.style.width = `100%`;

                // تحديث النسبة المئوية
                if (percentageEl) {
                    percentageEl.textContent = `${Math.round(percentage)}%`;
                }

                // تحديث التصنيف
                if (ratingEl) {
                    ratingEl.textContent = getRating(value, scale);
                }
            } else {
                console.warn(`Element with ID marker-${elementId} or scale-${elementId} not found`);
            }
        });
    }

    /**
     * إضافة انيميشن لمقاييس النتائج
     * @param {Object} results - نتائج المستخدم
     */
    function animateResultScales(results) {
        SCALES.forEach((scale, index) => {
            // تحويل الشرطة السفلية إلى شرطة عادية في المعرّف
            const elementId = scale.id.replace(/_/g, '-');
            const marker = document.getElementById(`marker-${elementId}`);
            const scaleFill = document.getElementById(`scale-${elementId}`);
            const percentageEl = document.getElementById(`percentage-${elementId}`);
            const ratingEl = document.getElementById(`rating-${elementId}`);

            if (marker && scaleFill) {
                // تحويل القيمة من -1 إلى 1 إلى نسبة مئوية (0% إلى 100%)
                const value = results[scale.id];
                const percentage = ((value + 1) / 2) * 100;

                // إنشاء انيميشن باستخدام GSAP
                // تعديل موقع المؤشر ليكون مركزه في النقطة المطلوبة بدلاً من حافته اليسرى
                gsap.fromTo(marker,
                    { left: "50%", xPercent: -50 },
                    {
                        left: `${percentage}%`,
                        xPercent: -50, // جعل نقطة الارتكاز في منتصف المؤشر
                        duration: 1.5,
                        ease: "elastic.out(1, 0.5)",
                        delay: index * 0.1
                    }
                );

                gsap.fromTo(scaleFill,
                    { width: "0%" },
                    {
                        width: "100%",
                        duration: 1,
                        ease: "power2.out",
                        delay: index * 0.1
                    }
                );

                // انيميشن للنسبة المئوية
                if (percentageEl) {
                    const percentage = Math.round(((value + 1) / 2) * 100);

                    // إذا كانت النتيجة أقل من 50، فالنتيجة تميل نحو اليسار
                    // وإلا، فالنتيجة تميل نحو اليمين
                    const direction = percentage < 50 ? scale.left : scale.right;
                    const strengthPercentage = percentage < 50 ? (100 - percentage * 2) : ((percentage - 50) * 2);

                    gsap.fromTo(percentageEl,
                        { textContent: "50%" },
                        {
                            textContent: `${Math.round(strengthPercentage)}%`,
                            duration: 1.5,
                            delay: index * 0.1,
                            snap: { textContent: 1 }
                        }
                    );
                }

                // انيميشن للتصنيف
                if (ratingEl) {
                    const rating = getRating(value, scale);
                    gsap.to(ratingEl, {
                        text: rating,
                        duration: 1,
                        delay: index * 0.1 + 0.5
                    });
                }
            } else {
                console.warn(`Element with ID marker-${elementId} or scale-${elementId} not found`);
            }
        });
    }

    /**
     * الحصول على تصنيف بناء على قيمة
     * @param {number} value - القيمة من -1 إلى 1
     * @param {Object} scale - كائن المقياس
     * @returns {string} - تصنيف النتيجة
     */
    function getRating(value, scale) {
        // تحويل القيمة من -1 إلى 1 إلى نسبة مئوية من 0 إلى 100
        const percentage = ((value + 1) / 2) * 100;

        // تحديد التصنيف بناء على النسبة المئوية
        if (percentage <= 10) {
            return scale.right + " جداً";
        } else if (percentage <= 30) {
            return scale.right;
        } else if (percentage <= 45) {
            return "يميل إلى " + scale.right;
        } else if (percentage <= 55) {
            return "محايد";
        } else if (percentage <= 70) {
            return "يميل إلى " + scale.left;
        } else if (percentage <= 90) {
            return scale.left;
        } else {
            return scale.left + " جداً";
        }
    }

    /**
     * إعادة تشغيل الاختبار
     */
    function restartTest() {
        // إعادة تعيين الإجابات
        answers = {};
        currentQuestionIndex = 0;

        // إعادة إظهار المقدمة
        gsap.to(resultsContainer, {
            opacity: 0,
            y: -20,
            duration: 0.3,
            onComplete: () => {
                resultsContainer.classList.add('hidden');
                introSection.classList.remove('hidden');

                gsap.fromTo(introSection,
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.3 }
                );
            }
        });
    }

    /**
     * مشاركة النتائج
     */
    function shareResults() {
        // حساب النتائج
        const results = calculateResults();

        // إنشاء نص المشاركة
        let shareText = "نتائجي في بوصلة سوريا:\n\n";

        SCALES.forEach(scale => {
            const value = results[scale.id];
            // تحويل القيمة من -1 إلى 1 إلى نسبة مئوية (0% إلى 100%)
            const percentage = Math.round(((value + 1) / 2) * 100);

            // إذا كانت النتيجة أقل من 50، فالنتيجة تميل نحو اليسار
            // وإلا، فالنتيجة تميل نحو اليمين
            const direction = percentage < 50 ? scale.left : scale.right;
            const strengthPercentage = percentage < 50 ? (100 - percentage * 2) : ((percentage - 50) * 2);

            shareText += `${scale.name}: ${direction} (${strengthPercentage}%)\n`;
        });

        shareText += "\nقم بإجراء الاختبار على: https://sycompass.github.io/sycompass/";

        // التحقق من وجود واجهة Clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            // نسخ النص إلى الحافظة
            navigator.clipboard.writeText(shareText)
                .then(() => {
                    alert("تم نسخ النتائج! يمكنك لصقها ومشاركتها مع أصدقائك.");
                })
                .catch(err => {
                    console.error('فشل في نسخ النص: ', err);

                    // إظهار نافذة مع النص إذا فشل النسخ
                    alert("يرجى نسخ النص التالي يدوياً:\n\n" + shareText);
                });
        } else {
            // إذا كانت واجهة Clipboard API غير متوفرة
            alert("يرجى نسخ النص التالي يدوياً:\n\n" + shareText);
        }
    }

    /**
     * وظيفة اختبار لإنشاء إجابات عشوائية وعرض النتائج
     */
    function generateRandomAnswers() {
        // إعادة تعيين الإجابات
        answers = {};

        // إنشاء إجابات عشوائية لكل سؤال
        QUESTIONS.forEach((question, index) => {
            // إنشاء قيمة عشوائية بين -2 و 2
            const possibleValues = [-2, -1, 0, 1, 2];
            const randomIndex = Math.floor(Math.random() * possibleValues.length);
            answers[index] = possibleValues[randomIndex];
        });

        // عرض النتائج
        showResults();
    }

    // إضافة زر الاختبار إلى واجهة المستخدم عند تحميل الصفحة
    // const testButton = document.createElement('button');
    // testButton.textContent = 'اختبار عشوائي';
    // testButton.className = 'bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded mt-4';
    // testButton.addEventListener('click', generateRandomAnswers);

    // إضافة زر الاختبار بعد زر البدء
    // document.getElementById('intro').appendChild(testButton);

    /**
     * عرض أسئلة فئة معينة في المودال
     * @param {string} categoryId - معرف الفئة
     */
    function showCategoryQuestions(categoryId) {
        // البحث عن الفئة في مصفوفة SCALES
        const scale = SCALES.find(s => s.id === categoryId);
        if (!scale) return;

        // تحديد عنوان المودال
        modalTitle.textContent = scale.name;

        // جمع الأسئلة المتعلقة بهذه الفئة
        const categoryQuestions = QUESTIONS.filter(q => q.category === categoryId);

        // إنشاء محتوى المودال
        let html = '<div class="space-y-6">';

        categoryQuestions.forEach(question => {
            // العثور على مؤشر السؤال في مصفوفة QUESTIONS الكاملة
            const questionIndex = QUESTIONS.findIndex(q => q.id === question.id);
            const userAnswer = answers[questionIndex];

            // تحديد التأثير النهائي لإجابة المستخدم على المقياس
            // نضرب إجابة المستخدم بتأثير السؤال لتحديد الاتجاه النهائي
            const finalEffect = userAnswer * question.effect;
            const effectType = finalEffect > 0 ? scale.left : scale.right;
            const effectStrength = Math.abs(question.effect) * Math.abs(userAnswer);

            // تحديد وصف القوة
            let strengthDesc = '';
            if (effectStrength >= 1.5) {
                strengthDesc = 'تأثير قوي';
            } else if (effectStrength >= 0.5) {
                strengthDesc = 'تأثير معتدل';
            } else {
                strengthDesc = 'تأثير ضعيف';
            }

            // تحديد لون التأثير بناءً على التأثير النهائي
            const effectColor = finalEffect > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800';

            html += `
                <div class="p-4 border rounded-lg">
                    <p class="text-lg font-medium mb-3">${question.text}</p>
                    
                    <div class="my-4">
                        <div class="flex justify-between text-sm text-gray-600 mb-2">
                            <span>أعارض بشدة</span>
                            <span>محايد</span>
                            <span>أوافق بشدة</span>
                        </div>
                        <div class="flex gap-2">
                            <button class="answer-btn flex-1 px-2 py-2 border border-gray-300 rounded-lg ${userAnswer === -2 ? 'selected' : ''}" disabled>-2</button>
                            <button class="answer-btn flex-1 px-2 py-2 border border-gray-300 rounded-lg ${userAnswer === -1 ? 'selected' : ''}" disabled>-1</button>
                            <button class="answer-btn flex-1 px-2 py-2 border border-gray-300 rounded-lg ${userAnswer === 0 ? 'selected' : ''}" disabled>0</button>
                            <button class="answer-btn flex-1 px-2 py-2 border border-gray-300 rounded-lg ${userAnswer === 1 ? 'selected' : ''}" disabled>+1</button>
                            <button class="answer-btn flex-1 px-2 py-2 border border-gray-300 rounded-lg ${userAnswer === 2 ? 'selected' : ''}" disabled>+2</button>
                        </div>
                    </div>
                    
                    <div class="flex items-center mt-4">
                        <span class="px-3 py-1 ${effectColor} rounded-full text-sm ml-2">تميل نحو: ${effectType}</span>
                        <span class="text-sm text-gray-600">${strengthDesc}</span>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        modalContent.innerHTML = html;

        // عرض المودال
        questionsModal.classList.remove('hidden');
        gsap.fromTo(questionsModal,
            { opacity: 0 },
            { opacity: 1, duration: 0.3 }
        );
    }

    /**
     * إغلاق المودال
     */
    function closeModal() {
        gsap.to(questionsModal, {
            opacity: 0,
            duration: 0.3,
            onComplete: () => {
                questionsModal.classList.add('hidden');
            }
        });
    }
}); 
