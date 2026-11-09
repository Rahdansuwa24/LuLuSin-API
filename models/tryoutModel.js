const { db } = require('../config/database/connection')
const { Sequelize, QueryTypes } = require('sequelize')
const { student } = require('../config/database/table/controler')


class tryoutModel {
    static async getall() {
        try {
            const [rows] = await db.query("SELECT t.tryout_id, t.tryout_name, t.status, COUNT(q.question_id) AS total_questions, (SELECT SUM(minimal_questions) FROM subjects) AS total_minimal_questions FROM tryouts t LEFT JOIN questions q ON q.id_tryout = t.tryout_id GROUP BY t.tryout_id, t.tryout_name, t.status")
            return rows
        } catch (err){
            throw err
        }
    }

    static async store(data) {
        try {
            const [result] = await db.query("insert into tryouts set tryout_name = ?", {replacements: [data.tryout_name]})
            return result
        } catch (err) {
            throw err
        }
    }

    static async update(id, data) {
        try {
            const [result] = await db.query("update tryouts set tryout_name = ? where tryout_id = ?", {replacements: [data.tryout_name, id]})
            return result
        } catch (err) {
            throw err
        }
    }

    static async delete(id) {
        try {
            const [result] = await db.query("delete from tryouts where tryout_id = ?", {replacements: [id]})
            return result
        } catch (err) {
            throw err
        }
    }

    static async getTryoutQuestionById(tryoutId) {
      try {
          const [rows] = await db.query("SELECT JSON_OBJECT('tryout_name', t.tryout_name, 'status', t.status, 'subject_categories', (SELECT JSON_ARRAYAGG(JSON_OBJECT('subject_category', sc.subject_category_name, 'items', (SELECT JSON_ARRAYAGG(JSON_OBJECT('id_subject', subj.subject_id, 'subject_name', subj.subject_name, 'minimal_questions', subj.minimal_questions, 'soal_dibuat', subj.jumlah_soal)) FROM (SELECT s.subject_id, s.subject_name, s.minimal_questions, COUNT(q.question_id) AS jumlah_soal FROM subjects s LEFT JOIN questions q ON q.id_subject = s.subject_id AND q.id_tryout = t.tryout_id WHERE s.id_subject_category = sc.subject_category_id GROUP BY s.subject_id, s.subject_name, s.minimal_questions) AS subj))) FROM subject_categories sc)) AS result FROM tryouts t WHERE t.tryout_id = ?", {replacements: [tryoutId]})
          return rows[0]
      } catch (err) {
          throw err
      }
  }
    
    static async dashboard() { 
      try {
          const [rows] = await db.query(
              "SELECT t.tryout_id, t.tryout_name, (SELECT COUNT(*) FROM questions q WHERE q.id_tryout = t.tryout_id) AS total_questions, (SELECT SUM(minimal_questions) FROM subjects) AS total_minimal_questions FROM tryouts t WHERE t.status = 'hide'")
          return rows
      } catch (err) {
          throw err
      }
  }

    static async updateStatus(data, tryoutId) {
        try {
            const [result] = await db.query("update tryouts set status = ? where tryout_id = ?", {replacements: [data.status, tryoutId]})
            return result
        } catch (err) {
            throw err
        }
    }

    static async getSubjectByIdSubject(subjectId) {
        try {
            const [rows] = await db.query("SELECT s.subject_name, sc.subject_category_name FROM subjects s JOIN subject_categories sc ON s.id_subject_category = sc.subject_category_id WHERE s.subject_id = ?", {replacements: [subjectId]})
            return rows
        } catch (err) {
            throw err
        }
    }


//#ok
    static async getAllTryoutQuestionBySubject(tryoutId, subjectId) {
      try {
          const [rows] = await db.query(
              `SELECT 
                  q.question_id AS question_id, 
                  q.question AS question, 
                  q.question_image AS question_image, 
                  JSON_ARRAYAGG(JSON_OBJECT('answer_option', ao.answer_option)) AS answer_options, 
                  MAX(CASE WHEN qe.question_explanation IS NOT NULL THEN ao.answer_option ELSE NULL END) AS correct_answer, 
                  MAX(qe.question_explanation) AS explanation, 
                  q.score AS score 
              FROM questions q 
              JOIN answer_options ao ON q.question_id = ao.id_question 
              LEFT JOIN questions_explanations qe ON ao.answer_option_id = qe.id_answer_option 
              WHERE q.id_tryout = ? AND q.id_subject = ? 
              GROUP BY q.question_id, q.question, q.question_image, q.score`,
              {replacements: [tryoutId, subjectId]}
          )
          return rows
      } catch (err) {
          throw err
      }
  }


    static async storeQuestionWithExplanation(data) {
      const { tryout_id, subject_id, question, question_image,score, answer_options, correct_answer_index, question_explanation} = data

      if (answer_options.length > 5) {
        throw new Error("Maksimal 5 opsi jawaban yang diperbolehkan")
      }

      const filledAnswerOptions = answer_options.concat(
        Array(5 - answer_options.length).fill("")
      )

      if (
        typeof correct_answer_index !== "number" ||
        correct_answer_index < 0 ||
        correct_answer_index >= filledAnswerOptions.length
      ) {
        throw new Error("Indeks jawaban benar tidak valid")
      }

      const transaction = await db.transaction()

      try {
        const [questionId] = await db.query("INSERT INTO questions (id_tryout, id_subject, question, question_image, score)  VALUES (:tryout_id, :subject_id, :question, :question_image, :score)", {
          replacements: { tryout_id, subject_id, question, question_image, score },
          transaction,
          type: QueryTypes.INSERT
        })

        if (!questionId) {
          throw new Error("Gagal mendapatkan ID soal dari query insert.")
        }

        const insertedOptionIds = []
        for (const option of filledAnswerOptions) {
          const value = option || ""
          const [optionId] = await db.query("INSERT INTO answer_options (id_question, answer_option)  VALUES (:questionId, :option)", {
            replacements: { questionId, option: value },
            transaction,
            type: QueryTypes.INSERT
          })
          if (!optionId) {
            throw new Error(`Gagal memasukkan opsi jawaban: ${value}`)
          }
          insertedOptionIds.push(optionId)
        }

        if (!insertedOptionIds.length) {
          throw new Error("Gagal memasukkan opsi jawaban ke tabel 'answer_options'.")
        }

        if (typeof insertedOptionIds[correct_answer_index] === "undefined") {
          throw new Error("Indeks jawaban benar tidak valid opsi jawaban tidak ditemukan.")
        }

        const correct_answer_option_id = insertedOptionIds[correct_answer_index]

        await db.query("INSERT INTO questions_explanations (id_answer_option, question_explanation)  VALUES (:correct_answer_option_id, :question_explanation)", {
          replacements: { correct_answer_option_id, question_explanation },
          transaction,
          type: QueryTypes.INSERT
        })

        await transaction.commit()

        return { questionId, insertedOptionIds }
      } catch (error) {
        await transaction.rollback()
        throw error
      }
    }

    static async deleteQuestionById(question_id, tryout_id, subject_id) {
      try {
        await db.query(`DELETE FROM questions  WHERE question_id = ? AND id_tryout = ? AND id_subject = ?`, { replacements: [question_id, tryout_id, subject_id] })
      } catch (error) {
        throw error
      }
    }

    static async updateQuestionWithExplanation(questionId, data) {
      const {tryout_id,subject_id,question,question_image,score,answer_options,correct_answer_index,question_explanation,} = data
    
      if (answer_options.length > 5) {
        throw new Error("Maksimal 5 opsi jawaban yang diperbolehkan")
      }
    
      const filledAnswerOptions = answer_options.concat(
        Array(5 - answer_options.length).fill("")
      )
    
      if (
        typeof correct_answer_index !== "number" ||
        correct_answer_index < 0 ||
        correct_answer_index >= filledAnswerOptions.length
      ) {
        throw new Error("Indeks jawaban benar tidak valid")
      }
    
      const transaction = await db.transaction()
    
      try {
        await db.query(`UPDATE questions SET id_tryout = :tryout_id,id_subject = :subject_id,question = :question,question_image = :question_image,score = :score WHERE question_id = :questionId`,
            {
                replacements: { tryout_id, subject_id, question, question_image, score, questionId }, transaction,
                type: QueryTypes.UPDATE,
            }
        )
    
        const [existingOptions] = await db.query(`SELECT answer_option_id FROM answer_options WHERE id_question = :questionId ORDER BY answer_option_id ASC`,
            { replacements: { questionId }, transaction }
        )
    
        if (!existingOptions || existingOptions.length !== 5) {
          throw new Error("Jumlah opsi jawaban untuk soal tidak valid. Diharapkan 5 opsi jawaban.")
        }
    
        const updatedOptionIds = []
        for (let index = 0; index < filledAnswerOptions.length; index++) {
          const value = filledAnswerOptions[index] || ""
          const answer_option_id = existingOptions[index].answer_option_id
    
          await db.query(`UPDATE answer_options SET answer_option = :option WHERE answer_option_id = :answer_option_id`,
                {
                    replacements: { option: value, answer_option_id },
                    transaction,
                    type: QueryTypes.UPDATE,
                }
            )
          updatedOptionIds.push(answer_option_id)
        }
    
        if (typeof updatedOptionIds[correct_answer_index] === "undefined") {
          throw new Error("Indeks jawaban benar tidak valid, opsi jawaban tidak ditemukan.")
        }
    
        const correct_answer_option_id = updatedOptionIds[correct_answer_index]
    
        const [explanationData] = await db.query(`SELECT questions_explanation_id FROM questions_explanations WHERE id_answer_option = :correct_answer_option_id`,
            { replacements: { correct_answer_option_id }, transaction }
        )
    
        if (explanationData && explanationData.length > 0) {
          await db.query(`UPDATE questions_explanations SET question_explanation = :question_explanation WHERE id_answer_option = :correct_answer_option_id`,
                {
                    replacements: { question_explanation, correct_answer_option_id },
                    transaction,
                    type: QueryTypes.UPDATE,
                }
            )
        } else {
          await db.query(`INSERT INTO questions_explanations (id_answer_option, question_explanation) VALUES (:correct_answer_option_id, :question_explanation)`,
                {
                    replacements: { correct_answer_option_id, question_explanation },
                    transaction,
                    type: QueryTypes.INSERT,
                }
            )
        }        
    
        await transaction.commit()
        return { questionId, updatedOptionIds }
      } catch (error) {
        await transaction.rollback()
        throw error
      }
    }

  static async getStudentById(idStudent) {
    try {
      const [rows] = await db.query(`SELECT student_name AS nama, NISN AS nisn FROM students WHERE student_id = ?`,
        { replacements: [idStudent] }
      )
      return rows[0] || null
    } catch (err) {
      throw err
    }
  }

  static async getSubjectById(idSubject) {
    try {
      const [rows] = await db.query(`SELECT s.time_limit AS total_waktu,sc.subject_category_name AS kategori_subjek, s.subject_name AS subjek FROM subjects s JOIN subject_categories sc ON s.id_subject_category = sc.subject_category_id WHERE s.subject_id = ?`,
        { replacements: [idSubject] }
      )
      return rows[0]
    } catch (err) {
      throw err
    }
  }


//#ok
  static async getQuestionsBySubjectId(idSubject, idTryout) {
    try {
      const [rows] = await db.query(
        `WITH numbered_questions AS ( SELECT q.question_id, q.question_image, q.question, s.minimal_questions, ROW_NUMBER() OVER ( PARTITION BY q.id_subject, q.id_tryout ORDER BY q.question_id ) AS rn FROM questions AS q JOIN subjects AS s ON s.subject_id = q.id_subject WHERE q.id_subject = ? AND q.id_tryout = ? ), limited_questions AS ( SELECT question_id, question_image, question FROM numbered_questions WHERE rn <= minimal_questions ) SELECT lq.question_id, lq.question_image AS image_question, lq.question, JSON_ARRAYAGG( JSON_OBJECT( 'id', ao.answer_option_id, 'text', ao.answer_option ) ) AS answer_options FROM limited_questions AS lq JOIN answer_options AS ao ON ao.id_question = lq.question_id GROUP BY lq.question_id, lq.question_image, lq.question`,
        { replacements: [idSubject, idTryout] }
      )
      return rows
    } catch (err) {
      throw err
    }
  }

  //#ok
  static async storeStudentAnswer({ idStudent, questionId, answerOptionId, idSubject, idTryout }) {
    try {
      const [checkQuestion] = await db.query(
        `SELECT q.question_id FROM questions q 
         JOIN tryouts t ON q.id_tryout = t.tryout_id 
         JOIN subjects s ON q.id_subject = s.subject_id 
         WHERE q.question_id = ? AND q.id_tryout = ? AND q.id_subject = ?`, 
        { replacements: [questionId, idTryout, idSubject] }
      );
      if (checkQuestion == 0) {
        throw new Error('Soal tidak sesuai dengan tryout dan subjek');
      }
  

      const [validationInsert] = await db.query(
        `SELECT COUNT(sa.student_answer_id) AS total
         FROM students_answers sa 
         JOIN answer_options ao ON sa.answer_options_id = ao.answer_option_id
         WHERE sa.id_student = ? AND ao.id_question = ?`, 
        { replacements: [idStudent, questionId] }
      );
      if (validationInsert[0].total > 0) {
        throw new Error('Siswa sudah menjawab soal ini');
      }
  
      // Ambil explanation id (boleh tetap ambil meski jawaban kosong)
      const [explRow] = await db.query(
        `SELECT qe.questions_explanation_id FROM questions_explanations qe 
         JOIN answer_options ao ON qe.id_answer_option = ao.answer_option_id 
         JOIN questions q ON ao.id_question = q.question_id 
         WHERE q.question_id = ?`, 
        { replacements: [questionId] }
      );
      const questionsExplanationId = explRow[0]?.questions_explanation_id || null;

  
      // Insert jawaban, biarkan answerOptionId null jika tidak dijawab
      const [insertResult] = await db.query(
        `INSERT INTO students_answers (id_student, answer_options_id, id_answer_option) 
         VALUES (?, ?, ?)`, 
        { replacements: [idStudent, answerOptionId, questionsExplanationId] }
      );
      return insertResult;
    } catch (err) {
      throw err;
    }
  }


  static async updateStudentAnswer({ idStudent, questionId, answerOptionId }) {
    const [result] = await db.query(`UPDATE students_answers SET answer_options_id = ? WHERE id_student = ? AND answer_options_id IN (SELECT answer_option_id FROM answer_options WHERE id_question = ?)`, {
        replacements: [answerOptionId, idStudent, questionId]
      }
    )

    return result
  }

  //#ok
  static async getTryoutName(idTryout) {
    try {
      const [rows] = await db.query(`
        SELECT 
          t.tryout_id, 
          t.tryout_name,
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'subject_id', s.subject_id,
              'subject_name', s.subject_name,
              'subject_category', sc.subject_category_name
            )
          ) as subjects
        FROM tryouts t
        JOIN questions q ON q.id_tryout = t.tryout_id
        JOIN subjects s ON s.subject_id = q.id_subject
        JOIN subject_categories sc ON sc.subject_category_id = s.id_subject_category
        WHERE t.tryout_id = ?
        GROUP BY t.tryout_id, t.tryout_name`,
        { replacements: [idTryout] }
      )
      return rows[0]
    } catch (err) {
      throw err
    }
  }

  static async deleetStudentAnswer(questionId, idSubject, idTryout) {
    try {
        const [result] = await db.query("DELETE sa FROM students_answers sa JOIN answer_options ao ON sa.answer_options_id = ao.answer_option_id JOIN questions q ON ao.id_question = q.question_id WHERE q.question_id = ? AND q.id_tryout = ? AND q.id_subject = ?", {replacements: [questionId, idTryout, idSubject]})
        return result
    } catch (err) {
        throw err
    }
  }

  static async checkQuestion(questionId, idTryout, idSubject) {
    try {
      const [result] = await db.query(
        `SELECT q.question_id FROM questions q JOIN tryouts t ON q.id_tryout = t.tryout_id JOIN subjects s ON q.id_subject = s.subject_id WHERE q.question_id = ? AND q.id_tryout = ? AND q.id_subject = ?`, { replacements: [questionId, idTryout, idSubject]
        }
      )
      
      return result
    } catch (err) {
      throw err
    }
  }

  static async getTryoutResult(idTryout, idStudent) {
    const [rows] = await db.query(`
      SELECT 
        q.question_id,
        q.score,
        sa.answer_options_id AS student_answer_option_id,
        qe.id_answer_option AS correct_answer_option_id
      FROM questions q
      LEFT JOIN (
        SELECT sa.answer_options_id, ao.id_question
        FROM students_answers sa
        JOIN answer_options ao ON sa.answer_options_id = ao.answer_option_id
        WHERE sa.id_student = ?
      ) sa ON sa.id_question = q.question_id
      LEFT JOIN questions_explanations qe ON qe.id_answer_option = (
        SELECT ao2.answer_option_id
        FROM answer_options ao2
        WHERE ao2.id_question = q.question_id
        AND ao2.answer_option_id = qe.id_answer_option
        LIMIT 1
      )
      WHERE q.id_tryout = ?
    `, { replacements: { idStudent, idTryout } })
  
    let totalScore = 0
    let totalMaxScore = 0
    let totalCorrect = 0
    let totalWrong = 0
    let totalEmpty = 0
  
    for (const row of rows) {
      totalMaxScore += row.score || 0
      if (!row.student_answer_option_id) {
        totalEmpty++
      } else if (row.student_answer_option_id === row.correct_answer_option_id) {
        totalCorrect++
        totalScore += row.score || 0
      } else {
        totalWrong++
      }
    }
  
    const averageScore = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0
  
    return {
      average_score: averageScore,
      total_correct: totalCorrect,
      total_wrong: totalWrong,
      total_empty: totalEmpty
    }
  }

  static async getTryoutResultByCategorySubject(idTryout, idStudent) {
    try {
      const [rows] = await db.query(`SELECT JSON_OBJECT( 'nama_kategori', cs.subject_category_name, 'subjek', JSON_ARRAYAGG( JSON_OBJECT( 'nama_subjek', s.subject_name, 'nilai_rata_rata', ts.average_score, 'total_jawaban_benar', ts.total_correct, 'total_jawaban_salah', ts.total_wrong, 'total_jawaban_kosong', ts.total_empty ) ) ) AS result FROM tryout_subject_scores ts JOIN subjects s ON ts.id_subject = s.subject_id JOIN subject_categories cs ON s.id_subject_category = cs.subject_category_id WHERE ts.id_tryout = ? AND ts.id_student = ? GROUP BY cs.subject_category_name`, { replacements: [idTryout, idStudent] })
       return rows
    } catch (err) {
      throw err
    }
  }

    static async getExpSubjectById(idSubject) {
    try {
      const [rows] = await db.query(`SELECT sc.subject_category_name AS kategori_subjek, s.subject_name AS subjek FROM subjects s JOIN subject_categories sc ON s.id_subject_category = sc.subject_category_id WHERE s.subject_id = ?`,
        { replacements: [idSubject] }
      )
      return rows[0]
    } catch (err) {
      throw err
    }
  }

  static async getScoreByTryoutId(idTryout, idStudent) {
    try {
      const [result] = await db.query(`select average_score, total_correct, total_wrong, total_empty from tryout_scores where id_tryout = ? and id_student = ?`, {replacements: [idTryout, idStudent]})
      return result
    } catch (err) {
      throw err
    }
  }

  static async getTryoutDetailResult(idTryout, idStudent, idSubject) {
    const [rows] = await db.query(`
      SELECT 
        q.question_id AS id_question,
        q.question_image AS image_question,
        q.question,
        ao.answer_option_id,
        ao.answer_option,
        sa.answer_options_id AS student_answer_option_id,
        sa2.answer_option AS jawaban_siswa,
        qe.id_answer_option AS correct_answer_option_id,
        ao_correct.answer_option AS correct_answer,
        qe.question_explanation AS explanation
      FROM questions q
      LEFT JOIN answer_options ao ON ao.id_question = q.question_id
      LEFT JOIN students_answers sa ON sa.answer_options_id = ao.answer_option_id AND sa.id_student = ?
      LEFT JOIN answer_options sa2 ON sa.answer_options_id = sa2.answer_option_id
      LEFT JOIN questions_explanations qe ON qe.id_answer_option = ao.answer_option_id
      LEFT JOIN answer_options ao_correct ON qe.id_answer_option = ao_correct.answer_option_id
      WHERE q.id_tryout = ? AND q.id_subject = ?
      ORDER BY q.question_id, ao.answer_option_id
    `, { replacements: [idStudent, idTryout, idSubject] })

    const map = new Map()
    for (const row of rows) {
      if (!map.has(row.id_question)) {
        map.set(row.id_question, {
          id_question: row.id_question,
          image_question: row.image_question,
          question: row.question,
          answer_options: [],
          jawaban_siswa: null,
          correct_answer: null,
          explanation: null
        })
      }
      const soal = map.get(row.id_question)
      soal.answer_options.push(row.answer_option)
      if (!soal.jawaban_siswa && row.jawaban_siswa) soal.jawaban_siswa = row.jawaban_siswa
      if (!soal.correct_answer && row.correct_answer) soal.correct_answer = row.correct_answer
      if (!soal.explanation && row.explanation) soal.explanation = row.explanation
    }
    return Array.from(map.values())
  } 

    static async isScoreAlreadyCalculated(tryoutId, studentId) {
      try {
        const [rows] = await db.query(
          `SELECT COUNT(*) AS count FROM tryout_subject_scores WHERE id_tryout = ? AND id_student = ?`,
          { replacements: [tryoutId, studentId] }
        );
        return rows[0].count > 0
      } catch (err) {
        throw err
      }
    }

    static async getTotalQuestionsInTryout(tryoutId) {
      try {
        const [rows] = await db.query(
          `SELECT COUNT(*) AS total FROM questions WHERE id_tryout = ?`,
          { replacements: [tryoutId] }
        );
        return rows[0].total
      } catch (err) {
        throw err;
      }
    }

  static async getTotalAnsweredQuestions(tryoutId, studentId) {
    try {
      const [rows] = await db.query(
        `SELECT COUNT(*) AS total FROM ( SELECT q.question_id FROM questions q JOIN answer_options ao ON ao.id_question = q.question_id LEFT JOIN students_answers sa ON sa.answer_options_id = ao.answer_option_id AND sa.id_student = ? WHERE q.id_tryout = ? GROUP BY q.question_id ) AS answered`,
        { replacements: [tryoutId, studentId] }
      );
      return rows[0].total
    } catch (err) {
      throw err;
    }
  }

  static async getSubjectsInTryout(tryoutId) {
    try {
      const [results] = await db.query(
        `SELECT DISTINCT s.subject_id FROM subjects s JOIN questions q ON q.id_subject = s.subject_id WHERE q.id_tryout = ?`,
        { replacements: [tryoutId] }
      );
      return results.map(row => row.subject_id);
    } catch (err) {
      throw err;
    }
  }

  static async insertSubjectScore({ tryoutId, studentId, subjectId }) {
    try {
      const [rows] = await db.query(
        `SELECT 
          CAST(FLOOR(1.0 * SUM(CASE WHEN stu.answer_options_id = qe.id_answer_option THEN q.score ELSE 0 END) / COUNT(q.question_id)) AS SIGNED) AS average_score, 
          SUM(CASE WHEN stu.answer_options_id IS NOT NULL AND stu.answer_options_id = qe.id_answer_option THEN 1 ELSE 0 END) AS total_correct, 
          SUM(CASE WHEN stu.answer_options_id IS NOT NULL AND stu.answer_options_id <> qe.id_answer_option THEN 1 ELSE 0 END) AS total_wrong, 
          SUM(CASE WHEN stu.answer_options_id IS NULL THEN 1 ELSE 0 END) AS total_empty 
        FROM questions q 
        LEFT JOIN (SELECT ao.id_question, sa.answer_options_id, sa.id_answer_option FROM students_answers sa JOIN answer_options ao ON sa.answer_options_id = ao.answer_option_id WHERE sa.id_student = ?) stu ON stu.id_question = q.question_id 
        LEFT JOIN questions_explanations qe ON qe.questions_explanation_id = stu.id_answer_option 
        WHERE q.id_tryout = ? AND q.id_subject = ?`,
        { replacements: [studentId, tryoutId, subjectId] }
      );

      if (!rows.length) {
        throw new Error("Tidak ditemukan data untuk insert.");
      }
  
      const { average_score, total_correct, total_wrong, total_empty } = rows[0];
  
      const [result] = await db.query(
        `INSERT INTO tryout_subject_scores (id_student, id_subject, id_tryout, average_score, total_correct, total_wrong, total_empty) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        { replacements: [studentId, subjectId, tryoutId, average_score, total_correct, total_wrong, total_empty] }
      );
  
      return result;
    } catch (err) {
      throw err;
    }
  }

  static async checkTryOutScore(studentId, tryoutId) {
    try {
      const [result] = await db.query(`select id_student, id_tryout from tryout_scores where id_student = ? and id_tryout`, {replacements: [studentId, tryoutId]})
      return result
    } catch (err) {
      throw err
    }
  }
  
  static async TryoutAggregatedScores(studentId, tryoutId) {
    try {
      const [result] = await db.query(`INSERT INTO tryout_scores (id_student, id_tryout, average_score, total_correct, total_wrong, total_empty) SELECT id_student, id_tryout, CAST(FLOOR(AVG(average_score)) AS SIGNED) AS average_score, SUM(total_correct) AS total_correct, SUM(total_wrong) AS total_wrong, SUM(total_empty) AS total_empty FROM tryout_subject_scores WHERE id_tryout = ? AND id_student = ? GROUP BY id_student, id_tryout`, {replacements: [tryoutId, studentId]})
      return result
    } catch (err) {
      throw err
    }
  }

//#ok
  static async storeExplanation(data) {
    try {
      const { id_answer_option, question_explanation } = data;
      if (typeof id_answer_option !== 'number') {
        throw new Error('id_answer_option must be a number');
      }
      if (typeof question_explanation !== 'string') {
        throw new Error('question_explanation must be a string');
      }
      const [result] = await db.query(
        "INSERT INTO questions_explanations (id_answer_option, question_explanation) VALUES (?, ?)",
        {
          replacements: [id_answer_option, question_explanation]
        }
      );
      return result;
    } catch (err) {
      throw err;
    }
  }

//#ok
  static async storeQuestionWithOptions({ tryout_id, subject_id, question, score, answer_options, question_image }) {
    const transaction = await db.transaction();
    try {
      const [questionId] = await db.query(
        "INSERT INTO questions (id_tryout, id_subject, question, question_image, score) VALUES (?, ?, ?, ?, ?)",
        { replacements: [tryout_id, subject_id, question, question_image, score], transaction, type: QueryTypes.INSERT }
      );
  
      const insertedOptionIds = [];
      for (const option of answer_options) {
        const [optionId] = await db.query(
          "INSERT INTO answer_options (id_question, answer_option) VALUES (?, ?)",
          { replacements: [questionId, option], transaction, type: QueryTypes.INSERT }
        );
        insertedOptionIds.push(optionId);
      }
  
      await transaction.commit();
      return { questionId, insertedOptionIds };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

//#ok
  static async updateQuestionById({ question_id, tryout_id, subject_id, question, score, answer_options, question_image }) {
    // Update table questions
    await db.query(
      "UPDATE questions SET question = ?, score = ?, question_image = ? WHERE question_id = ? AND id_tryout = ? AND id_subject = ?",
      { replacements: [question, score, question_image, question_id, tryout_id, subject_id] }
    );
    // Update answer options (opsional: update satu per satu atau hapus lalu insert ulang)
    // Contoh update sederhana (pastikan urutan answer_options sama dengan di DB)
    const [existingOptions] = await db.query(
      "SELECT answer_option_id FROM answer_options WHERE id_question = ? ORDER BY answer_option_id ASC",
      { replacements: [question_id] }
    );
    for (let i = 0; i < answer_options.length; i++) {
      await db.query(
        "UPDATE answer_options SET answer_option = ? WHERE answer_option_id = ?",
        { replacements: [answer_options[i], existingOptions[i].answer_option_id] }
      );
    }
  }

  //salah
static async insertEmptyAnswersIfNotExist({ idStudent, idTryout }) {
  // Ambil semua soal di tryout ini
  const [questions] = await db.query(
    `SELECT question_id FROM questions WHERE tryout_id = ?`,
    { replacements: [idTryout] }
  );

  for (const q of questions) {
    // Cek apakah sudah ada jawaban untuk soal ini
    const [exist] = await db.query(
      `SELECT COUNT(*) as total FROM students_answers sa
       JOIN answer_options ao ON sa.answer_option_id = ao.answer_option_id
       WHERE sa.student_id = ? AND ao.question_id = ?`,
      { replacements: [idStudent, q.question_id] }
    );

    if (exist[0].total == 0) {
      // Ambil salah satu explanation_id dari soal ini
      const [explanation] = await db.query(
        `SELECT qe.explanation_id
         FROM questions_explanations qe
         JOIN answer_options ao ON qe.answer_option_id = ao.answer_option_id
         WHERE ao.question_id = ?
         LIMIT 1`,
        { replacements: [q.question_id] }
      );

      const explanationId = explanation.length > 0 ? explanation[0].explanation_id : null;

      await db.query(
        `INSERT INTO students_answers (student_id, answer_option_id, explanation_id)
         VALUES (?, NULL, ?)`,
        { replacements: [idStudent, explanationId] }
      );
    }
  }
}

  static async disqualifyStudentTryout(studentId, tryoutId) {
    try {
      const subjectIds = await this.getSubjectsInTryout(tryoutId);

      // Bersihkan data skor parsial tryout ini jika ada sebelumnya
      await db.query("DELETE FROM tryout_subject_scores WHERE id_tryout = ? AND id_student = ?", {
        replacements: [tryoutId, studentId]
      });
      await db.query("DELETE FROM tryout_scores WHERE id_tryout = ? AND id_student = ?", {
        replacements: [tryoutId, studentId]
      });

      // Hitung total butir soal dalam tryout
      let totalQuestions = 0;
      try {
        const [totalQRows] = await db.query("SELECT COUNT(*) as total FROM questions WHERE id_tryout = ?", {
          replacements: [tryoutId]
        });
        totalQuestions = totalQRows[0]?.total || 0;
      } catch (e) {
        totalQuestions = 0;
      }

      // Masukkan skor 0 untuk setiap subjek pada tryout
      for (const subjectId of subjectIds) {
        await db.query(
          "INSERT INTO tryout_subject_scores (id_student, id_subject, id_tryout, average_score, total_correct, total_wrong, total_empty) VALUES (?, ?, ?, 0, 0, 0, 0)",
          { replacements: [studentId, subjectId, tryoutId] }
        );
      }

      // Masukkan skor 0 ke tryout_scores
      const [result] = await db.query(
        "INSERT INTO tryout_scores (id_student, id_tryout, average_score, total_correct, total_wrong, total_empty) VALUES (?, ?, 0, 0, 0, ?)",
        { replacements: [studentId, tryoutId, totalQuestions] }
      );

      return result;
    } catch (err) {
      throw err;
    }
  }
}

module.exports = tryoutModel;
